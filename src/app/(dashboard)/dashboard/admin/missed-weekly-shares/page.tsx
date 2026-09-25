import { requireRole } from "@/lib/permissions/guard";
import { getMissedWeeklyShares } from "@/lib/stats/client-flags";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { MissedWeeklySharesTable } from "./missed-weekly-shares-table";
import { prisma } from "@/lib/db/prisma";

export default async function MissedWeeklySharesPage({
  searchParams,
}: {
  searchParams: Promise<{ assignedTo?: string }>;
}) {
  await requireRole("/dashboard/admin/missed-weekly-shares");
  const { assignedTo } = await searchParams;
  const { count, clients } = await getMissedWeeklyShares({ assignedToId: assignedTo });
  const employee = assignedTo
    ? await prisma.user.findUnique({ where: { id: assignedTo }, select: { name: true } })
    : null;

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Missed Weekly Shares"
        subtitle={
          employee
            ? `${count} of ${employee.name}'s active clients with no profile shared in the last 7 days.`
            : `${count} active client${count === 1 ? "" : "s"} with no profile shared in the last 7 days.`
        }
      />
      <MissedWeeklySharesTable clients={clients} />
    </div>
  );
}
