import { getExpiredClients } from "@/actions/subscriptions/subscription.actions";
import { auth } from "@/lib/auth/auth";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { SubscriptionsTable } from "../subscriptions/subscriptions-table";
import { ExportButton } from "@/components/shared/export-button";

export default async function ExpiredClientsPage() {
  const subscriptions = await getExpiredClients();

  const session = await auth();
  const isAdmin = !!session?.user && ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);

  const exportData = subscriptions.map((s) => ({
    "Profile Name": s.profile.name,
    "Profile Code": s.profile.profileCode,
    "Plan": s.plan.name,
    "Price": s.plan.price,
    "Start Date": new Date(s.startDate).toLocaleDateString("en-IN"),
    "End Date": s.endDate ? new Date(s.endDate).toLocaleDateString("en-IN") : "",
    "Status": s.status,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <DashboardHero
          title="Expired Clients"
          subtitle="Clients whose subscription has expired."
        />
        <ExportButton data={exportData} filename="expired-clients" label="Export" />
      </div>
      <SubscriptionsTable subscriptions={subscriptions} isAdmin={isAdmin} />
    </div>
  );
}
