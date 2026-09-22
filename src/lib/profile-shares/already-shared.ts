import { prisma } from "@/lib/db/prisma";

// Profile IDs already shared with this client across ALL of their
// subscriptions (any status). Optionally limited to a candidate list.
export async function getAlreadySharedProfileIds(
  clientProfileId: string,
  candidateIds?: string[]
): Promise<Set<string>> {
  const rows = await prisma.profileShare.findMany({
    where: {
      subscription: { profileId: clientProfileId },
      ...(candidateIds ? { sharedProfileId: { in: candidateIds } } : {}),
    },
    select: { sharedProfileId: true },
  });
  return new Set(rows.map((r) => r.sharedProfileId));
}
