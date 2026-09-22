import { auth } from "@/lib/auth/auth";
import { getUnifiedProfiles } from "@/actions/profiles/profile.actions";
import { DashboardHero, heroVariantForRole } from "@/components/layout/dashboard-hero";
import { ProfilesTable } from "@/app/(dashboard)/dashboard/admin/profiles/profiles-table";

export default async function SalesProfilesPage() {
  const session = await auth();
  const profiles = await getUnifiedProfiles({ approvalStatus: "APPROVED" });

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Assigned Active Profiles"
        subtitle="Approved profiles assigned to you."
        variant={heroVariantForRole(session!.user.role)}
      />
      <ProfilesTable profiles={profiles} employees={[]} canAssign={false} basePath="/dashboard/admin/profiles" />
    </div>
  );
}
