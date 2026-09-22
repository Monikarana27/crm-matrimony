import { prisma } from "@/lib/db/prisma";
import { getTeamMemberIds } from "@/lib/hierarchy/team";

const TEAM_ROLES = ["SERVICE_TL", "SERVICE_MANAGER"];
const HOUR_MS = 60 * 60 * 1000;
const OVERDUE_HOURS = 24; // matches the Overdue Welcome Calls page

export type WelcomeCallSummary = {
  pending: number;
  overdue: number;
  teamScope: boolean;
  calls: {
    id: string;
    name: string;
    phone: string | null;
    code: string | null;
    assignee: string | null;
    waitingLabel: string;
    overdue: boolean;
  }[];
};

// Same scope as the Welcome Calls page: own calls, plus the team for TL/Manager.
export async function getServiceWelcomeCallSummary(
  userId: string,
  role: string
): Promise<WelcomeCallSummary> {
  const teamScope = TEAM_ROLES.includes(role);
  const assigneeIds = teamScope ? [userId, ...(await getTeamMemberIds(userId))] : [userId];
  const where = { status: "PENDING" as const, assignedToId: { in: assigneeIds } };
  const now = Date.now();
  const overdueBefore = new Date(now - OVERDUE_HOURS * HOUR_MS);

  const [pending, overdue, next] = await Promise.all([
    prisma.welcomeCall.count({ where }),
    prisma.welcomeCall.count({ where: { ...where, createdAt: { lt: overdueBefore } } }),
    prisma.welcomeCall.findMany({
      where,
      orderBy: { createdAt: "asc" }, // oldest first = most urgent
      take: 5,
      include: {
        lead: { select: { name: true, phone: true } },
        profile: { select: { name: true, phone: true, profileCode: true } },
        assignedTo: { select: { name: true } },
      },
    }),
  ]);

  const calls = next.map((c) => {
    const hours = Math.floor((now - c.createdAt.getTime()) / HOUR_MS);
    return {
      id: c.id,
      name: c.profile?.name ?? c.lead?.name ?? "Unknown",
      phone: c.profile?.phone ?? c.lead?.phone ?? null,
      code: c.profile?.profileCode ?? null,
      assignee: teamScope ? c.assignedTo?.name ?? null : null,
      waitingLabel:
        hours < 1 ? "Just now" : hours < 24 ? `${hours}h waiting` : `${Math.floor(hours / 24)}d waiting`,
      overdue: hours >= OVERDUE_HOURS,
    };
  });

  return { pending, overdue, teamScope, calls };
}
