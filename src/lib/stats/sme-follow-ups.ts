import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export type SmeFollowUpEntry = {
  id: string;
  note: string;
  createdAt: Date;
  followUpDate: Date | null;
  resolvedAt: Date | null;
  resolvedByName: string | null;
  isOverdue: boolean;
  employeeId: string;
  employeeName: string;
  clientName: string | null;
  clientProfileCode: string | null;
};

export type MyFollowUpEntry = {
  id: string;
  note: string;
  createdAt: Date;
  followUpDate: Date | null;
  isOverdue: boolean;
  fromName: string;
  clientName: string | null;
  clientProfileCode: string | null;
};

// Follow-up date/time is stored verbatim (see parseVerbatimFollowUp in
// sme-follow-up.actions.ts): the literal digits typed, in a UTC-labeled field,
// not a real UTC instant. Legacy/date-only entries (literal midnight, no time
// picked) stay overdue only from the next calendar day, exactly as before.
// Entries with an actual time become overdue the moment that time passes.
function isOverdueDate(followUpDate: Date | null, resolvedAt: Date | null) {
  if (resolvedAt || !followUpDate) return false;
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowVerbatim = new Date(Date.now() + IST_OFFSET_MS);
  const isMidnight =
    followUpDate.getUTCHours() === 0 &&
    followUpDate.getUTCMinutes() === 0 &&
    followUpDate.getUTCSeconds() === 0;
  if (isMidnight) {
    const todayVerbatim = nowVerbatim.toISOString().slice(0, 10);
    return followUpDate.toISOString().slice(0, 10) < todayVerbatim;
  }
  return followUpDate.getTime() < nowVerbatim.getTime();
}

/** SME side: follow-ups the signed-in SME created. Newest first, max 300. */
export async function getSmeFollowUps(): Promise<SmeFollowUpEntry[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!session.user.isSME) return [];

  const rows = await prisma.smeFollowUp.findMany({
    where: { createdById: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      note: true,
      createdAt: true,
      followUpDate: true,
      resolvedAt: true,
      resolvedBy: { select: { name: true } },
      employeeId: true,
      employee: { select: { name: true } },
      clientProfile: { select: { name: true, profileCode: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    note: r.note,
    createdAt: r.createdAt,
    followUpDate: r.followUpDate,
    resolvedAt: r.resolvedAt,
    resolvedByName: r.resolvedBy?.name ?? null,
    isOverdue: isOverdueDate(r.followUpDate, r.resolvedAt),
    employeeId: r.employeeId,
    employeeName: r.employee.name ?? "Unknown",
    clientName: r.clientProfile?.name ?? null,
    clientProfileCode: r.clientProfile?.profileCode ?? null,
  }));
}

/** Employee side: OPEN follow-ups assigned to the signed-in user. */
export async function getMyFollowUps(): Promise<MyFollowUpEntry[]> {
  const session = await auth();
  if (!session?.user) return [];

  const rows = await prisma.smeFollowUp.findMany({
    where: { employeeId: session.user.id, resolvedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      note: true,
      createdAt: true,
      followUpDate: true,
      createdBy: { select: { name: true } },
      clientProfile: { select: { name: true, profileCode: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    note: r.note,
    createdAt: r.createdAt,
    followUpDate: r.followUpDate,
    isOverdue: isOverdueDate(r.followUpDate, null),
    fromName: r.createdBy.name ?? "SME",
    clientName: r.clientProfile?.name ?? null,
    clientProfileCode: r.clientProfile?.profileCode ?? null,
  }));
}
