import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth/auth";

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function requireStaff() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

// A client counts as "Non Connected" if there has been no activity —
// no ProfileRemark on their own profile, and no ProfileShareComment on
// any candidate profile shared with them — in the last 2 days.
export async function getNonConnectedClients() {
  const session = await requireStaff();
  const scopedFilter = !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ? { profile: { assignedToId: session.user.id } }
    : {};
  const twoDaysAgo = new Date(Date.now() - TWO_DAYS_MS);

  const activeSubs = await prisma.subscription.findMany({
    where: { status: "ACTIVE", ...scopedFilter },
    select: {
      id: true,
      startDate: true,
      profile: { select: { id: true, name: true, profileCode: true, phone: true } },
      profileShares: { select: { id: true } },
    },
  });

  if (activeSubs.length === 0) return { count: 0, clients: [] as const };

  const profileIds = activeSubs.map((s) => s.profile.id);
  const shareIds = activeSubs.flatMap((s) => s.profileShares.map((ps) => ps.id));

  const [remarkGroups, commentGroups] = await Promise.all([
    prisma.profileRemark.groupBy({
      by: ["profileId"],
      where: { profileId: { in: profileIds } },
      _max: { createdAt: true },
    }),
    shareIds.length > 0
      ? prisma.profileShareComment.groupBy({
          by: ["profileShareId"],
          where: { profileShareId: { in: shareIds } },
          _max: { createdAt: true },
        })
      : Promise.resolve([] as { profileShareId: string; _max: { createdAt: Date | null } }[]),
  ]);

  const remarkMap = new Map(remarkGroups.map((r) => [r.profileId, r._max.createdAt]));
  const commentMap = new Map(commentGroups.map((c) => [c.profileShareId, c._max.createdAt]));

  const flagged = activeSubs
    .map((sub) => {
      const remarkDate = remarkMap.get(sub.profile.id) ?? null;
      const shareCommentDates = sub.profileShares
        .map((ps) => commentMap.get(ps.id))
        .filter((d): d is Date => !!d);
      const latestShareComment = shareCommentDates.length
        ? new Date(Math.max(...shareCommentDates.map((d) => d.getTime())))
        : null;

      const dates = [remarkDate, latestShareComment].filter((d): d is Date => !!d);
      const lastActivity = dates.length
        ? new Date(Math.max(...dates.map((d) => d.getTime())))
        : sub.startDate;

      return {
        subscriptionId: sub.id,
        profileId: sub.profile.id,
        name: sub.profile.name,
        profileCode: sub.profile.profileCode,
        phone: sub.profile.phone,
        lastActivity,
      };
    })
    .filter((c) => c.lastActivity < twoDaysAgo)
    .sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime());

  return { count: flagged.length, clients: flagged };
}

// A client counts as a "missed weekly share" if their subscription has
// been active for at least 7 days and no ProfileShare has been created
// for them in the last 7 days.
export async function getMissedWeeklyShares() {
  const session = await requireStaff();
  const scopedFilter = !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ? { profile: { assignedToId: session.user.id } }
    : {};
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  const activeSubs = await prisma.subscription.findMany({
    where: { status: "ACTIVE", startDate: { lt: sevenDaysAgo }, ...scopedFilter },
    select: {
      id: true,
      startDate: true,
      profile: {
        select: {
          id: true,
          name: true,
          profileCode: true,
          phone: true,
          assignedTo: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (activeSubs.length === 0) return { count: 0, clients: [] as const };

  const subIds = activeSubs.map((s) => s.id);
  // last share ever (any date), not just within the last 7 days — needed to
  // show the actual last-shared date and "days since" for each flagged client.
  const lastShareGroups = await prisma.profileShare.groupBy({
    by: ["subscriptionId"],
    where: { subscriptionId: { in: subIds } },
    _max: { sharedAt: true },
  });
  const lastShareMap = new Map(lastShareGroups.map((g) => [g.subscriptionId, g._max.sharedAt]));

  const flagged = activeSubs
    .map((sub) => ({ sub, lastSharedAt: lastShareMap.get(sub.id) ?? null }))
    .filter(({ lastSharedAt }) => !lastSharedAt || lastSharedAt < sevenDaysAgo)
    .map(({ sub, lastSharedAt }) => {
      const sinceMs = lastSharedAt
        ? Date.now() - lastSharedAt.getTime()
        : Date.now() - sub.startDate.getTime();
      return {
        subscriptionId: sub.id,
        profileId: sub.profile.id,
        name: sub.profile.name,
        profileCode: sub.profile.profileCode,
        phone: sub.profile.phone,
        subscriptionStart: sub.startDate,
        lastSharedAt,
        daysSinceLastShare: Math.floor(sinceMs / ONE_DAY_MS),
        assignedToName: sub.profile.assignedTo?.name ?? null,
      };
    })
    .sort((a, b) => b.daysSinceLastShare - a.daysSinceLastShare);

  return { count: flagged.length, clients: flagged };
}

// A welcome call counts as overdue if it's still PENDING more than 24 hours
// after it was created/assigned.
export async function getOverdueWelcomeCalls(options?: { department?: "SALES" | "SERVICE" }) {
  const session = await requireStaff();
  const scopedFilter = !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ? { assignedToId: session.user.id }
    : {};
  const departmentFilter: Prisma.WelcomeCallWhereInput =
    options?.department === "SERVICE"
      ? { assignedTo: { is: { role: { in: ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"] } } } }
      : options?.department === "SALES"
      ? { assignedTo: { is: { role: { in: ["SALES", "SALES_TL", "SALES_MANAGER"] } } } }
      : {};
  const oneDayAgo = new Date(Date.now() - ONE_DAY_MS);

  const overdue = await prisma.welcomeCall.findMany({
    where: { status: "PENDING", createdAt: { lt: oneDayAgo }, ...scopedFilter, ...departmentFilter },
    orderBy: { createdAt: "desc" },
    include: {
      lead: { select: { id: true, name: true, phone: true } },
      profile: {
        select: {
          id: true,
          name: true,
          phone: true,
          profileCode: true,
          subscriptions: {
            orderBy: { startDate: "desc" },
            take: 1,
            include: {
              plan: { select: { name: true } },
              payments: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { soldById: true },
              },
            },
          },
        },
      },
      assignedTo: { select: { id: true, name: true } },
    },
  });

  const soldByIds = Array.from(
    new Set(
      overdue
        .map((wc) => wc.profile?.subscriptions[0]?.payments[0]?.soldById)
        .filter((id): id is string => Boolean(id))
    )
  );
  const soldByUsers = soldByIds.length
    ? await prisma.user.findMany({ where: { id: { in: soldByIds } }, select: { id: true, name: true } })
    : [];
  const soldByMap = new Map(soldByUsers.map((u) => [u.id, u.name]));

  const calls = overdue.map((wc) => {
    const sub = wc.profile?.subscriptions[0];
    const soldById = sub?.payments[0]?.soldById;
    return {
      ...wc,
      membershipType: sub?.plan.name ?? null,
      assignDate: sub?.startDate ?? null,
      expiryDate: sub?.endDate ?? null,
      soldBy: soldById ? soldByMap.get(soldById) ?? null : null,
    };
  });

  return { count: calls.length, calls };
}
