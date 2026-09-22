import { prisma } from "@/lib/db/prisma";
import type { Role } from "@/lib/permissions/roles";

async function getEligibleEmployees(roles: Role[]) {
  const now = new Date();

  const onLeaveIds = await prisma.leaveRequest.findMany({
    where: { status: "APPROVED", startDate: { lte: now }, endDate: { gte: now } },
    select: { userId: true },
  });
  const onLeaveSet = new Set(onLeaveIds.map((l) => l.userId));

  const employees = await prisma.user.findMany({
    where: { role: { in: roles }, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return employees.filter((e) => !onLeaveSet.has(e.id));
}

async function getNextInRotation(poolKey: string, roles: Role[]): Promise<string | null> {
  const eligible = await getEligibleEmployees(roles);
  if (eligible.length === 0) return null;

  const setting = await prisma.systemSetting.findUnique({ where: { key: poolKey } });
  const lastId = setting?.value ?? null;

  let nextIndex = 0;
  if (lastId) {
    const lastIndex = eligible.findIndex((e) => e.id === lastId);
    nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % eligible.length;
  }

  const next = eligible[nextIndex];

  await prisma.systemSetting.upsert({
    where: { key: poolKey },
    create: { key: poolKey, value: next.id },
    update: { value: next.id },
  });

  return next.id;
}

// Used for: new leads, new profiles (both start life with Sales — unpaid clients).
export async function getNextSalesAssignee(): Promise<string | null> {
  return getNextInRotation("auto_assign_sales", ["SALES", "SALES_TL", "SALES_MANAGER"]);
}

// Auto-assignment policy: ONLY Meta leads are round-robin assigned. Every other
// lead and every profile stays unassigned until someone assigns it manually.
const META_SOURCE_PATTERNS = ["meta", "facebook", "instagram"];

export function isMetaLeadSource(source: string | null | undefined): boolean {
  const s = (source ?? "").toLowerCase();
  return META_SOURCE_PATTERNS.some((p) => s.includes(p));
}

const META_SOURCE_WHERE = META_SOURCE_PATTERNS.map((p) => ({
  source: { contains: p, mode: "insensitive" as const },
}));

export async function getNextSalesAssigneeForLead(source: string | null | undefined): Promise<string | null> {
  return isMetaLeadSource(source) ? getNextSalesAssignee() : null;
}

// Used for: profiles whose client just made a PAID payment.
export async function getNextServiceAssignee(): Promise<string | null> {
  return getNextInRotation("auto_assign_service", ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"]);
}

export async function autoDistributeUnassignedLeads(changedById: string) {
  const unassigned = await prisma.lead.findMany({
    where: { assignedToId: null, deletedAt: null, OR: META_SOURCE_WHERE },
    select: { id: true },
  });

  let count = 0;
  for (const lead of unassigned) {
    const nextId = await getNextSalesAssignee();
    if (!nextId) break;

    await prisma.lead.update({ where: { id: lead.id }, data: { assignedToId: nextId, assignedAt: new Date() } });
    await prisma.leadAssignmentHistory.create({
      data: { leadId: lead.id, fromEmployeeId: null, toEmployeeId: nextId, changedById },
    });
    count++;
  }
  return count;
}

export async function autoDistributeUnassignedProfiles(_changedById: string) {
  // Auto-assignment is disabled for profiles: they are assigned manually only.
  return 0;
}

// Called when a payment is confirmed PAID. Old round-robin auto-assign-to-
// Service behavior is retired (see plan point 4) — instead the profile is
// dropped to UNASSIGNED and a PENDING/unassigned WelcomeCall is created (if
// one doesn't already exist for this profile) for Service staff to manually
// pick up via the Newly Paid Clients page.
export async function unassignProfileForServiceOnPayment(profileId: string, changedById: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { assignedTo: { select: { role: true } } },
  });

  const serviceRoles = ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"];
  if (profile?.assignedTo && serviceRoles.includes(profile.assignedTo.role)) {
    return; // already with a Service employee, don't disturb on repeat payments
  }

  await prisma.profile.update({
    where: { id: profileId },
    data: { assignedToId: null, status: "UNASSIGNED" },
  });

  await prisma.activityLog.create({
    data: {
      actorId: changedById,
      action: "PROFILE_UNASSIGNED_FOR_SERVICE_ON_PAYMENT",
      entityType: "Profile",
      entityId: profileId,
    },
  });

  const existingWelcomeCall = await prisma.welcomeCall.findFirst({
    where: { profileId },
    select: { id: true },
  });
  if (!existingWelcomeCall) {
    await createWelcomeCallEntry({ profileId, assignedToId: null });
  }
}

export async function createWelcomeCallEntry(params: {
  leadId?: string;
  profileId?: string;
  assignedToId: string | null;
}) {
  await prisma.welcomeCall.create({
    data: {
      leadId: params.leadId ?? null,
      profileId: params.profileId ?? null,
      assignedToId: params.assignedToId,
    },
  });
}