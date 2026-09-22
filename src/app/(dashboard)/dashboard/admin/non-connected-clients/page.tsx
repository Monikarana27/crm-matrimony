import { requireRole } from "@/lib/permissions/guard";
import { getNonConnectedClients } from "@/lib/stats/client-flags";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { NonConnectedClientsTable } from "./non-connected-clients-table";

export default async function NonConnectedClientsPage() {
  await requireRole("/dashboard/admin/non-connected-clients");
  const { count, clients } = await getNonConnectedClients();

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Non Connected Clients"
        subtitle={`${count} active client${count === 1 ? "" : "s"} with no update in the last 2 days.`}
      />
      <NonConnectedClientsTable clients={clients} />
    </div>
  );
}
