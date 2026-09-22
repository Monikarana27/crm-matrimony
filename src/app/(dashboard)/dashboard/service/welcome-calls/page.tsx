import Link from "next/link";
import { getCallLogs } from "@/actions/call-logs/call-log.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CallLogsTable } from "@/app/(dashboard)/dashboard/admin/welcome-calls/call-logs-table";

export default async function ServiceWelcomeCallsPage() {
  const callLogs = await getCallLogs();
  const connected = callLogs.filter((c) => c.outcome === "CONNECTED").length;
  const completionRate = callLogs.length > 0 ? Math.round((connected / callLogs.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <DashboardHero title="Welcome Calls" subtitle={`${callLogs.length} calls logged · ${completionRate}% connected`} />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Call History</h2>
        <Button asChild>
          <Link href="/dashboard/admin/welcome-calls/new">
            <Plus className="mr-2 h-4 w-4" />
            Log Call
          </Link>
        </Button>
      </div>
      <CallLogsTable callLogs={callLogs} showEmployeeFilter={false} />
    </div>
  );
}