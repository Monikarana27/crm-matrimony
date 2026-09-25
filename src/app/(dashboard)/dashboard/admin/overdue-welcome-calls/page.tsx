import { requireRole } from "@/lib/permissions/guard";
import { getOverdueWelcomeCalls } from "@/lib/stats/client-flags";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { OverdueWelcomeCallsTable } from "./overdue-welcome-calls-table";
import { prisma } from "@/lib/db/prisma";

export default async function OverdueWelcomeCallsPage({
  searchParams,
}: {
  searchParams: Promise<{ assignedTo?: string }>;
}) {
  await requireRole("/dashboard/admin/overdue-welcome-calls");
  const { assignedTo } = await searchParams;
  const { count, calls } = await getOverdueWelcomeCalls({ assignedToId: assignedTo });
  const employee = assignedTo
    ? await prisma.user.findUnique({ where: { id: assignedTo }, select: { name: true } })
    : null;

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Overdue Welcome Calls"
        subtitle={
          employee
            ? `${count} of ${employee.name}'s welcome calls still pending after 24+ hours.`
            : `${count} welcome call${count === 1 ? "" : "s"} still pending after 24+ hours.`
        }
      />
      <OverdueWelcomeCallsTable calls={calls} />
    </div>
  );
}
