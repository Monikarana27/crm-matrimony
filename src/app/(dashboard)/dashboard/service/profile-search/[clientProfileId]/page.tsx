import { prisma } from "@/lib/db/prisma";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { ProfileSearchForm } from "./profile-search-form";

export default async function ProfileSearchPage({
  params,
}: {
  params: Promise<{ clientProfileId: string }>;
}) {
  const { clientProfileId } = await params;
  const clientProfile = await prisma.profile.findUnique({ where: { id: clientProfileId } });

  const [religions, castes, motherTongues] = await Promise.all([
    prisma.religion.findMany({ orderBy: { name: "asc" } }),
    prisma.caste.findMany({ orderBy: { name: "asc" } }),
    prisma.motherTongueRef.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Profile Search"
        subtitle={`Find and send matching profiles to ${clientProfile?.name ?? "client"}`}
      />
      <ProfileSearchForm
        clientProfileId={clientProfileId}
        clientEmail={clientProfile?.email ?? ""}
        religions={religions}
        castes={castes}
        motherTongues={motherTongues}
      />
    </div>
  );
}