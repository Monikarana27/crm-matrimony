import { getServiceQualityRollup } from "@/lib/stats/sme-rollup";
import { getServiceFeedbackFeed, getActiveServiceEmployees } from "@/lib/stats/sme-feedback";
import { getPendingPPValidationCount } from "@/lib/stats/pp-validation";
import { SmeQualityView } from "@/components/sme/sme-quality-view";
import { SmeFeedbackFeed } from "@/components/sme/sme-feedback-feed";
import { SmeFollowUpTab } from "@/components/sme/sme-follow-up-tab";
import { SmeClientCallsTab } from "@/components/sme/sme-client-calls-tab";
import { DashboardTabs } from "@/components/layout/dashboard-tabs";
import { PPApprovalTab } from "@/components/pp-validation/pp-approval-tab";

export default async function SmeDashboardPage() {
  const [rows, { feed }, employees, pendingPPCount] = await Promise.all([
    getServiceQualityRollup(),
    getServiceFeedbackFeed(),
    getActiveServiceEmployees(),
    getPendingPPValidationCount(),
  ]);
  const qualityRows = rows.map((r) => ({ ...r, isOwnTeam: false }));

  return (
    <DashboardTabs
      tabs={[
        { label: "By Employee", content: <SmeQualityView rows={qualityRows} /> },
        { label: "Client Feedback", content: <SmeFeedbackFeed feed={feed} employees={employees} /> },
        { label: "Follow-ups", content: <SmeFollowUpTab /> },
        { label: "Client Calls", content: <SmeClientCallsTab /> },
        { label: "PP Validation", content: <PPApprovalTab />, badge: pendingPPCount },
      ]}
    />
  );
}
