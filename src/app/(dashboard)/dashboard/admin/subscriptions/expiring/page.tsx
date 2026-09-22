import { getExpiringSubscriptions } from "@/actions/subscriptions/expiry.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { ExpiringSubscriptionsTable, type ExpiringRow } from "./expiring-subscriptions-table";

export default async function ExpiringSubscriptionsPage() {
  const expiring = await getExpiringSubscriptions(30);

  const rows: ExpiringRow[] = expiring.map((s) => ({
    id: s.id,
    profileId: s.profile.id,
    profileName: s.profile.name,
    profileCode: s.profile.profileCode,
    planName: s.plan.name,
    endDate: s.endDate!.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Expiring Soon"
        subtitle={`${expiring.length} subscription${expiring.length === 1 ? "" : "s"} expiring within 30 days`}
      />
      <ExpiringSubscriptionsTable rows={rows} />
    </div>
  );
}
