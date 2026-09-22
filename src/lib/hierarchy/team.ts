import { prisma } from "@/lib/db/prisma";

/**
 * Returns the IDs of every user who reports, directly or indirectly,
 * to the given user — i.e. their full recursive "team". The given
 * userId itself is NOT included in the result.
 *
 * Walks the managerId self-relation breadth-first, one query per
 * level. Cycle-safe: a user can never be added to the result twice,
 * and any user already processed is never re-expanded, so an
 * accidental cycle in managerId assignments cannot cause an infinite
 * loop — worst case it just stops making progress and returns.
 */
export async function getTeamMemberIds(userId: string): Promise<string[]> {
  const result = new Set<string>();
  let frontier = [userId];

  while (frontier.length > 0) {
    const reports = await prisma.user.findMany({
      where: { managerId: { in: frontier } },
      select: { id: true },
    });

    const newIds = reports
      .map((r) => r.id)
      .filter((id) => !result.has(id) && id !== userId);

    if (newIds.length === 0) break;

    newIds.forEach((id) => result.add(id));
    frontier = newIds;
  }

  return Array.from(result);
}