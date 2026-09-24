import { prisma } from "@/lib/db/prisma";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * ONE_DAY_MS;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const SERVICE_ROLES = ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"] as const;

export type EmployeeQualityRow = {
  employeeId: string;
  employeeName: string;
  role: string;
  nonConnected: number;
  missedWeeklyShares: number;
  overdueWelcomeCalls: number;
  total: number;
};

/** Same underlying signals as the Non Connected / Missed Weekly Shares /
 * Overdue Welcome Calls pages, grouped by the assigned Service employee
 * instead of listed per client — built for the SME quality-oversight view. */
export async function getServiceQualityRollup(): Promise<EmployeeQualityRow[]> {
  const now = Date.now();
  const twoDaysAgo = new Date(now - TWO_DAYS_MS);
  const sevenDaysAgo = new Date(now - SEVEN_DAYS_MS);
  const oneDayAgo = new Date(now - ONE_DAY_MS);

  const employees = await prisma.user.findMany({
    where: { role: { in: [...SERVICE_ROLES] }, active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  const byId = new Map(employees.map((e) => [e.id, { ...e, nonConnected: 0, missedWeeklyShares: 0, overdueWelcomeCalls: 0 }]));

  // Overdue welcome calls: assignedToId is direct, so a single groupBy suffices.
  const overdueGroups = await prisma.welcomeCall.groupBy({
    by: ["assignedToId"],
    where: { status: "PENDING", createdAt: { lt: oneDayAgo }, assignedTo: { role: { in: [...SERVICE_ROLES] } } },
    _count: { _all: true },
  });
  for (const g of overdueGroups) {
    if (g.assignedToId && byId.has(g.assignedToId)) byId.get(g.assignedToId)!.overdueWelcomeCalls = g._count._all;
  }

  // Non-connected + missed weekly shares both start from active subscriptions
  // with their client profile's assignee, so fetch once and derive both.
  const activeSubs = await prisma.subscription.findMany({
    where: { status: "ACTIVE", profile: { deletedAt: null } },
    select: {
      id: true,
      startDate: true,
      profile: { select: { id: true, assignedToId: true } },
      profileShares: { select: { id: true, sharedAt: true } },
    },
  });

  const profileIds = activeSubs.map((s) => s.profile.id);
  const shareIds = activeSubs.flatMap((s) => s.profileShares.map((ps) => ps.id));

  const [remarkGroups, commentGroups] = await Promise.all([
    prisma.profileRemark.groupBy({ by: ["profileId"], where: { profileId: { in: profileIds } }, _max: { createdAt: true } }),
    shareIds.length
      ? prisma.profileShareComment.groupBy({ by: ["profileShareId"], where: { profileShareId: { in: shareIds } }, _max: { createdAt: true } })
      : Promise.resolve([] as { profileShareId: string; _max: { createdAt: Date | null } }[]),
  ]);
  const remarkMap = new Map(remarkGroups.map((r) => [r.profileId, r._max.createdAt]));
  const commentMap = new Map(commentGroups.map((c) => [c.profileShareId, c._max.createdAt]));

  for (const sub of activeSubs) {
    const assigneeId = sub.profile.assignedToId;
    if (!assigneeId || !byId.has(assigneeId)) continue;
    const row = byId.get(assigneeId)!;

    // Non-connected: no remark or share comment activity in the last 2 days.
    const remarkDate = remarkMap.get(sub.profile.id) ?? null;
    const shareCommentDates = sub.profileShares.map((ps) => commentMap.get(ps.id)).filter((d): d is Date => !!d);
    const latestShareComment = shareCommentDates.length ? new Date(Math.max(...shareCommentDates.map((d) => d.getTime()))) : null;
    const dates = [remarkDate, latestShareComment].filter((d): d is Date => !!d);
    const lastActivity = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : sub.startDate;
    if (lastActivity < twoDaysAgo) row.nonConnected++;

    // Missed weekly share: subscription 7+ days old with no share in the last 7 days.
    if (sub.startDate < sevenDaysAgo) {
      const lastSharedAt = sub.profileShares.length
        ? new Date(Math.max(...sub.profileShares.map((ps) => ps.sharedAt.getTime())))
        : null;
      if (!lastSharedAt || lastSharedAt < sevenDaysAgo) row.missedWeeklyShares++;
    }
  }

  return Array.from(byId.values())
    .map((r) => ({
      employeeId: r.id,
      employeeName: r.name,
      role: r.role,
      nonConnected: r.nonConnected,
      missedWeeklyShares: r.missedWeeklyShares,
      overdueWelcomeCalls: r.overdueWelcomeCalls,
      total: r.nonConnected + r.missedWeeklyShares + r.overdueWelcomeCalls,
    }))
    .sort((a, b) => b.total - a.total);
}
