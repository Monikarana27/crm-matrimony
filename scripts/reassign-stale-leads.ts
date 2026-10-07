import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

const SALES_ROLES = ["SALES", "SALES_TL", "SALES_MANAGER"];
const ROTATION_KEY = "auto_assign_sales"; // shared with Meta-lead auto-assignment
const DAILY_CAP_PER_EMPLOYEE = 7; // this script's own reassignments only, rolling 23h
// Accounts that no real person uses. Never put leads on these.
const EXCLUDED_USER_IDS = [
  "cmtikr0sp0001l39ig0j04f11", // Sales Executive (sales@elitebandhan.com)
  "cmto3zkni0009l3kx0tl5oh9j", // Test employee (test@elitebandhan.com)
];
// Real staff who are not in a sales role but should still receive leads.
const INCLUDED_EXTRA_USER_IDS = [
  "cmtikr0sw0007l39ioxk0lgns", // Devender Kumar (SERVICE_MANAGER)
  "cmtikr0t3000dl39i1d69v61y", // Shahina Sheikh (SERVICE_MANAGER)
];

// Same IST day-boundary logic as expire-subscriptions.ts.
function startOfTodayIST(): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const startIstMs = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate());
  return new Date(startIstMs - IST_OFFSET_MS);
}

async function getEligibleEmployees() {
  const now = new Date();
  const onLeave = await prisma.leaveRequest.findMany({
    where: { status: "APPROVED", startDate: { lte: now }, endDate: { gte: startOfTodayIST() } },
    select: { userId: true },
  });
  const onLeaveSet = new Set(onLeave.map((l) => l.userId));

  const employees = await prisma.user.findMany({
    where: {
      active: true,
      id: { notIn: EXCLUDED_USER_IDS },
      OR: [{ role: { in: SALES_ROLES as never } }, { id: { in: INCLUDED_EXTRA_USER_IDS } }],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return employees.filter((e) => !onLeaveSet.has(e.id));
}

// Mutates the shared rotation pointer. Only call this in a real (non-dry) run.
async function getDailyAssignedCount(employeeId: string, systemUserId: string): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
  return prisma.leadAssignmentHistory.count({
    where: { toEmployeeId: employeeId, changedById: systemUserId, changedAt: { gte: oneDayAgo } },
  });
}

async function getNextInRotation(): Promise<{ id: string; name: string } | null> {
  const eligible = await getEligibleEmployees();
  if (eligible.length === 0) return null;

  const setting = await prisma.systemSetting.findUnique({ where: { key: ROTATION_KEY } });
  const lastId = setting?.value ?? null;

  let nextIndex = 0;
  if (lastId) {
    const lastIndex = eligible.findIndex((e) => e.id === lastId);
    nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % eligible.length;
  }
  const next = eligible[nextIndex];

  await prisma.systemSetting.upsert({
    where: { key: ROTATION_KEY },
    create: { key: ROTATION_KEY, value: next.id },
    update: { value: next.id },
  });
  return next;
}

let runId: string | null = null;

function idleDaysOf(lead: { assignedAt: Date | null; createdAt: Date; remarks: { createdAt: Date }[] }, now: Date): number {
  const floor = lead.assignedAt ?? lead.createdAt;
  const r = lead.remarks[0]?.createdAt;
  const lastTouch = r && r > floor ? r : floor;
  return Math.floor((now.getTime() - lastTouch.getTime()) / 86400000);
}

function cutoffDaysForStatus(status: string): number {
  return status === "NOT_INTERESTED" ? 7 : 20;
}

async function main() {
  const now = new Date();

  const candidates = await prisma.lead.findMany({
    where: {
      deletedAt: null,
      assignedToId: { not: null },
      status: { notIn: ["CONVERTED", "CLOSED", "WRONG_NUMBER_FAKE_LEAD", "NO_NOT_EXIST"] },
    },
    select: {
      id: true,
      name: true,
      status: true,
      assignedToId: true,
      assignedAt: true,
      createdAt: true,
      assignedTo: { select: { name: true } },
      remarks: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });

  const stale = candidates.filter((lead) => {
    const floor = lead.assignedAt ?? lead.createdAt;
    const remarkAt = lead.remarks[0]?.createdAt;
    const lastTouch = remarkAt && remarkAt > floor ? remarkAt : floor;
    const cutoffDate = new Date(now.getTime() - cutoffDaysForStatus(lead.status) * 24 * 60 * 60 * 1000);
    return lastTouch < cutoffDate;
  });

  console.log(
    `[${now.toISOString()}] ${DRY_RUN ? "[DRY RUN] " : ""}Found ${stale.length} stale lead(s) of ${candidates.length} assigned candidate(s).`
  );

  if (DRY_RUN) {
    for (const lead of stale) {
      const days = cutoffDaysForStatus(lead.status);
      console.log(`  WOULD REASSIGN: "${lead.name}" (${lead.id}) — status=${lead.status}, idle>=${days}d, currently with ${lead.assignedTo?.name ?? "?"}`);
    }
    console.log(`[${new Date().toISOString()}] Dry run complete. No writes made.`);
    await prisma.$disconnect();
    return;
  }

  const systemUser = await prisma.user.findUnique({ where: { email: "system@elitebandhan.internal" } });
  if (!systemUser) {
    throw new Error("System user not found. Run scripts/create-system-user.ts first.");
  }

  const run = await prisma.staleReassignmentRun.create({
    data: { candidates: candidates.length, staleFound: stale.length },
  });
  runId = run.id;
  const items: {
    leadId: string; leadName: string; leadStatus: string; idleDays: number;
    fromEmployeeId: string | null; toEmployeeId: string | null; outcome: string;
  }[] = [];

  let reassigned = 0;
  let skippedSame = 0;
  let stoppedAtCap = false;

  for (const lead of stale) {
    if (stoppedAtCap) break;

    const eligibleCount = (await getEligibleEmployees()).length;
    let next: { id: string; name: string } | null = null;
    for (let attempt = 0; attempt < eligibleCount; attempt++) {
      const candidate = await getNextInRotation();
      if (!candidate) break;
      const dailyCount = await getDailyAssignedCount(candidate.id, systemUser.id);
      if (dailyCount >= DAILY_CAP_PER_EMPLOYEE) {
        console.log(`  SKIP employee at daily cap (${dailyCount}/${DAILY_CAP_PER_EMPLOYEE}): ${candidate.name}`);
        continue;
      }
      next = candidate;
      break;
    }

    if (!next) {
      console.log(`[${new Date().toISOString()}] All eligible employees at daily cap (${DAILY_CAP_PER_EMPLOYEE}). Stopping run.`);
      stoppedAtCap = true;
      break;
    }
    if (next.id === lead.assignedToId) {
      skippedSame++;
      items.push({ leadId: lead.id, leadName: lead.name, leadStatus: String(lead.status), idleDays: idleDaysOf(lead, now), fromEmployeeId: lead.assignedToId, toEmployeeId: next.id, outcome: "SKIPPED_SAME_ASSIGNEE" });
      console.log(`  SKIP (rotation landed on current assignee): ${lead.name} (${lead.id})`);
      continue;
    }

    const fromId = lead.assignedToId!;
    const days = cutoffDaysForStatus(lead.status);

    await prisma.$transaction([
      prisma.lead.update({ where: { id: lead.id }, data: { assignedToId: next.id, assignedAt: now } }),
      prisma.leadAssignmentHistory.create({
        data: {
          leadId: lead.id,
          fromEmployeeId: fromId,
          toEmployeeId: next.id,
          changedById: systemUser.id,
          note: `Auto-reassigned: no update in ${days} days`,
        },
      }),
      prisma.notification.create({
        data: {
          recipientId: fromId,
          type: "LEAD_REASSIGNED_STALE",
          content: `Lead "${lead.name}" was auto-reassigned after ${days} days with no update.`,
          entityType: "LEAD",
          entityId: lead.id,
        },
      }),
      prisma.notification.create({
        data: {
          recipientId: next.id,
          type: "LEAD_REASSIGNED_STALE",
          content: `Lead "${lead.name}" was auto-assigned to you (idle ${idleDaysOf(lead, now)} days, previously with ${lead.assignedTo?.name ?? "another employee"}).`,
          entityType: "LEAD",
          entityId: lead.id,
        },
      }),
    ]);

    console.log(`  REASSIGNED: "${lead.name}" (${lead.id}) from ${lead.assignedTo?.name ?? "?"} to ${next.name}`);
    reassigned++;
    items.push({ leadId: lead.id, leadName: lead.name, leadStatus: String(lead.status), idleDays: idleDaysOf(lead, now), fromEmployeeId: fromId, toEmployeeId: next.id, outcome: "REASSIGNED" });
  }

  console.log(
    `[${new Date().toISOString()}] Reassigned ${reassigned} lead(s). Skipped ${skippedSame} (same assignee)${stoppedAtCap ? ". Stopped early: daily cap reached." : "."}`
  );
  const doneIds = new Set(items.map((i) => i.leadId));
  const pending = stale.filter((l) => !doneIds.has(l.id));
  for (const l of pending) {
    items.push({ leadId: l.id, leadName: l.name, leadStatus: String(l.status), idleDays: idleDaysOf(l, now), fromEmployeeId: l.assignedToId, toEmployeeId: null, outcome: "NOT_PROCESSED_CAP" });
  }
  await prisma.staleReassignmentItem.createMany({ data: items.map((i) => ({ ...i, runId: run.id })) });
  await prisma.staleReassignmentRun.update({
    where: { id: run.id },
    data: { finishedAt: new Date(), reassigned, skippedSame, notProcessed: pending.length, stoppedAtCap },
  });
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  if (runId) {
    await prisma.staleReassignmentRun.update({ where: { id: runId }, data: { finishedAt: new Date(), error: String((e as Error)?.message ?? e).slice(0, 500) } }).catch(() => {});
  }
  await prisma.$disconnect();
  process.exit(1);
});
