import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getRefundClients } from "@/actions/subscriptions/refund.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { RefundsTable } from "./refunds-table";

export default async function RefundClientsPage() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const refunds = await getRefundClients();
  const pending = refunds.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Refund Clients"
        subtitle={"Clients marked for refund because the service was not good. " + pending + " pending."}
      />
      <RefundsTable refunds={refunds} />
    </div>
  );
}
