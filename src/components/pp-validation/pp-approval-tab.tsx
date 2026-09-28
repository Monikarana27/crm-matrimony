import { getReligions, getCastes, getMotherTongues } from "@/actions/master-data/master-data.actions";
import { getPendingPPRequests, getReviewedPPRequests } from "@/lib/stats/pp-validation";
import { getActiveServiceEmployees } from "@/lib/stats/sme-feedback";
import { PPApprovalPanel } from "@/components/pp-validation/pp-approval-panel";
import { PPValidatedList } from "@/components/pp-validation/pp-validated-list";
import { PPApprovalSwitcher } from "@/components/pp-validation/pp-approval-switcher";

export async function PPApprovalTab() {
  const [religions, castes, motherTongues, requests, employees, reviewed] = await Promise.all([
    getReligions(),
    getCastes(),
    getMotherTongues(),
    getPendingPPRequests(),
    getActiveServiceEmployees(),
    getReviewedPPRequests(),
  ]);

  return (
    <PPApprovalSwitcher
      pendingCount={requests.length}
      validatedCount={reviewed.length}
      pending={
        <PPApprovalPanel
          requests={requests}
          religions={religions}
          castes={castes}
          motherTongues={motherTongues}
          employees={employees}
        />
      }
      validated={<PPValidatedList rows={reviewed} />}
    />
  );
}
