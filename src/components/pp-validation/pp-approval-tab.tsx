import { getReligions, getCastes, getMotherTongues } from "@/actions/master-data/master-data.actions";
import { getPendingPPRequests } from "@/lib/stats/pp-validation";
import { getActiveServiceEmployees } from "@/lib/stats/sme-feedback";
import { PPApprovalPanel } from "@/components/pp-validation/pp-approval-panel";

export async function PPApprovalTab() {
  const [religions, castes, motherTongues, requests, employees] = await Promise.all([
    getReligions(),
    getCastes(),
    getMotherTongues(),
    getPendingPPRequests(),
    getActiveServiceEmployees(),
  ]);

  return (
    <PPApprovalPanel
      requests={requests}
      religions={religions}
      castes={castes}
      motherTongues={motherTongues}
      employees={employees}
    />
  );
}
