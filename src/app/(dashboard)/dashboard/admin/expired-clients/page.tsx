import { getExpiredClients } from "@/actions/subscriptions/subscription.actions";
import { auth } from "@/lib/auth/auth";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { SubscriptionsTable } from "../subscriptions/subscriptions-table";

export default async function ExpiredClientsPage() {
  const subscriptions = await getExpiredClients();

  const session = await auth();
  const isAdmin = !!session?.user && ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Expired Clients"
        subtitle="Clients whose subscription has expired."
      />
      <SubscriptionsTable subscriptions={subscriptions} isAdmin={isAdmin} />
    </div>
  );
}
