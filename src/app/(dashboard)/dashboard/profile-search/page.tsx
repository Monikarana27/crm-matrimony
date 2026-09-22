import { prisma } from "@/lib/db/prisma";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { ProfileSearchForm } from "./search-form";
export default async function ProfileSearchPage() {
  const [religions, castes, motherTongues] = await Promise.all([
    prisma.religion.findMany({ orderBy: { name: "asc" } }),
    prisma.caste.findMany({ orderBy: { name: "asc" } }),
    prisma.motherTongueRef.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <DashboardHero title="Profile Search" subtitle="Search all profiles by criteria" />
      <ProfileSearchForm religions={religions} castes={castes} motherTongues={motherTongues} />
    </div>
  );
}
