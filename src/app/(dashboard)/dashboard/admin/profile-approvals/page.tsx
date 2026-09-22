import { getPendingApprovalProfiles } from "@/actions/profiles/approval.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { ApprovalList } from "./approval-list";

export default async function ProfileApprovalsPage() {
  const profiles = await getPendingApprovalProfiles();
  return (
    <div className="space-y-6">
      <DashboardHero title="Profile Approvals" subtitle={`${profiles.length} pending review`} />
      <ApprovalList profiles={profiles} />
    </div>
  );
}