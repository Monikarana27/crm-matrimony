import { auth } from "@/lib/auth/auth";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { getDiscountEligibleClients } from "@/actions/payment-offers/payment-offer.actions";
import { DiscountsTable } from "./discounts-table";

export default async function DiscountsPage() {
  const session = await auth();
  const clients = await getDiscountEligibleClients();
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(session!.user.role);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Discounts"
        subtitle={isAdmin ? "All active paying clients — create special offers." : "Your assigned paying clients."}
      />
      <DiscountsTable clients={clients} showAssignee={isAdmin} />
    </div>
  );
}