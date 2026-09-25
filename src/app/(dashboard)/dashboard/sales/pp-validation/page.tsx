import { DashboardHero } from "@/components/layout/dashboard-hero";
import { getReligions, getCastes, getMotherTongues } from "@/actions/master-data/master-data.actions";
import { getMyPPRequests } from "@/lib/stats/pp-validation";
import { loadPPRequestForEditAction } from "@/actions/pp-validation/pp-validation.actions";
import { PPRequestForm } from "@/components/pp-validation/pp-request-form";
import { PPRequestsList } from "@/components/pp-validation/pp-requests-list";

export default async function SalesPPValidationPage() {
  const [religions, castes, motherTongues, requests] = await Promise.all([
    getReligions(),
    getCastes(),
    getMotherTongues(),
    getMyPPRequests(),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Partner Preference Validation"
        subtitle="Send a client's requirements to your SME for a match-availability check before proceeding."
      />
      <PPRequestForm religions={religions} castes={castes} motherTongues={motherTongues} />
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">YOUR REQUESTS</h2>
        <PPRequestsList
          requests={requests}
          religions={religions}
          castes={castes}
          motherTongues={motherTongues}
          loadForEdit={loadPPRequestForEditAction}
        />
      </div>
    </div>
  );
}
