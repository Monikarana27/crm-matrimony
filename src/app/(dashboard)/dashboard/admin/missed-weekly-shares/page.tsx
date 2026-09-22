import { requireRole } from "@/lib/permissions/guard";
import { getMissedWeeklyShares } from "@/lib/stats/client-flags";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { MissedWeeklySharesTable } from "./missed-weekly-shares-table";

export default async function MissedWeeklySharesPage() {
  await requireRole("/dashboard/admin/missed-weekly-shares");
  const { count, clients } = await getMissedWeeklyShares();

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Missed Weekly Shares"
        subtitle={`${count} active client${count === 1 ? "" : "s"} with no profile shared in the last 7 days.`}
      />
      <MissedWeeklySharesTable clients={clients} />
    </div>
  );
}
