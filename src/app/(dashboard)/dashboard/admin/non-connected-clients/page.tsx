import { requireRole } from "@/lib/permissions/guard";
import { getNonConnectedClients } from "@/lib/stats/client-flags";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { NonConnectedClientsTable } from "./non-connected-clients-table";
import { prisma } from "@/lib/db/prisma";

export default async function NonConnectedClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ assignedTo?: string }>;
}) {
  await requireRole("/dashboard/admin/non-connected-clients");
  const { assignedTo } = await searchParams;
  const { count, clients } = await getNonConnectedClients({ assignedToId: assignedTo });
  const employee = assignedTo
    ? await prisma.user.findUnique({ where: { id: assignedTo }, select: { name: true } })
    : null;

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Non Connected Clients"
        subtitle={
          employee
            ? `${count} of ${employee.name}'s active clients with no update in the last 2 days.`
            : `${count} active client${count === 1 ? "" : "s"} with no update in the last 2 days.`
        }
      />
      <NonConnectedClientsTable clients={clients} />
    </div>
  );
}
