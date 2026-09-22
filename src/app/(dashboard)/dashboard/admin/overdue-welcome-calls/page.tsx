import { requireRole } from "@/lib/permissions/guard";
import { getOverdueWelcomeCalls } from "@/lib/stats/client-flags";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { OverdueWelcomeCallsTable } from "./overdue-welcome-calls-table";

export default async function OverdueWelcomeCallsPage() {
  await requireRole("/dashboard/admin/overdue-welcome-calls");
  const { count, calls } = await getOverdueWelcomeCalls();

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Overdue Welcome Calls"
        subtitle={`${count} welcome call${count === 1 ? "" : "s"} still pending after 24+ hours.`}
      />
      <OverdueWelcomeCallsTable calls={calls} />
    </div>
  );
}
