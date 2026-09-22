import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { findRankedMatches } from "@/actions/matching/matching.actions";
import { MatchingResults } from "./matching-results";

export default async function MatchingPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  const client = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true, email: true },
  });
  if (!client) notFound();

  const matches = await findRankedMatches(profileId);

  return (
    <MatchingResults
      matches={matches}
      clientEmail={client.email ?? ""}
      clientProfileId={client.id}
    />
  );
}
