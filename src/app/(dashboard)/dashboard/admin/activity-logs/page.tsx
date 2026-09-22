import { getActivityLogs, getActivityEntityTypes } from "@/actions/activity-logs/activity-log.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { ActivityLogsTable } from "./activity-logs-table";
import Link from "next/link";

export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string }>;
}) {
  const { entityType } = await searchParams;

  const [logs, entityTypes] = await Promise.all([
    getActivityLogs(entityType ? { entityType } : undefined),
    getActivityEntityTypes(),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Activity Logs"
        subtitle="A complete audit trail of every action taken across the CRM."
      />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/admin/activity-logs"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            !entityType
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          All
        </Link>
        {entityTypes.map((type) => (
          <Link
            key={type}
            href={`/dashboard/admin/activity-logs?entityType=${type}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              entityType === type
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {type}
          </Link>
        ))}
      </div>

      <ActivityLogsTable logs={logs} />
    </div>
  );
}