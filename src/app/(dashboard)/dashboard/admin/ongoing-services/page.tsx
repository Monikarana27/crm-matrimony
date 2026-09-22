import { getOngoingServices } from "@/actions/subscriptions/subscription.actions";
import { auth } from "@/lib/auth/auth";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { SubscriptionsTable } from "../subscriptions/subscriptions-table";

export default async function OngoingServicesPage() {
  const subscriptions = await getOngoingServices();

  const session = await auth();
  const isAdmin = !!session?.user && ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Ongoing Services"
        subtitle="Active and on-hold clients whose welcome call is complete."
      />
      <SubscriptionsTable subscriptions={subscriptions} isAdmin={isAdmin} showFindMatch />
    </div>
  );
}
