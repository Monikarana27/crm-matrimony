import { auth } from "@/lib/auth/auth";
import { getFollowUpLeads } from "@/actions/leads/lead.actions";
import { DashboardHero, heroVariantForRole } from "@/components/layout/dashboard-hero";
import { LeadsTable } from "../../admin/leads/leads-table";

export default async function FollowUpTodayPage() {
  const session = await auth();
  const leads = await getFollowUpLeads();

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Follow-up Today"
        subtitle="Leads with a follow-up date due, oldest first."
        variant={heroVariantForRole(session!.user.role)}
      />
      <LeadsTable leads={leads} employees={[]} canAssign={false} />
    </div>
  );
}
