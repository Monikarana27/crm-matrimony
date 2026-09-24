import Link from "next/link";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { getServiceQualityRollup } from "@/lib/stats/sme-rollup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLE_LABEL: Record<string, string> = { SERVICE: "Service", SERVICE_TL: "Team Lead", SERVICE_MANAGER: "Manager" };

function Metric({ label, value, href, warn }: { label: string; value: number; href: string; warn: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col rounded-md border px-3 py-2 text-center transition-colors hover:bg-muted ${
        warn ? "border-amber-300 bg-amber-50" : "border-border"
      }`}
    >
      <span className={`text-lg font-bold tabular-nums ${warn ? "text-amber-700" : ""}`}>{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </Link>
  );
}

export default async function SmeDashboardPage() {
  const rows = await getServiceQualityRollup();
  const totals = rows.reduce(
    (acc, r) => ({
      nonConnected: acc.nonConnected + r.nonConnected,
      missedWeeklyShares: acc.missedWeeklyShares + r.missedWeeklyShares,
      overdueWelcomeCalls: acc.overdueWelcomeCalls + r.overdueWelcomeCalls,
    }),
    { nonConnected: 0, missedWeeklyShares: 0, overdueWelcomeCalls: 0 }
  );

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Service Quality Oversight"
        subtitle="How every Service employee is doing on client contact, weekly shares, and welcome calls."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Non Connected Clients (org-wide)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">{totals.nonConnected}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Missed Weekly Shares (org-wide)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">{totals.missedWeeklyShares}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overdue Welcome Calls (org-wide)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">{totals.overdueWelcomeCalls}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Employee</CardTitle>
          <p className="text-sm text-muted-foreground">Sorted by total flagged items — highest first.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No active Service employees found.</p>}
          {rows.map((r) => (
            <div key={r.employeeId} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{r.employeeName}</p>
                <p className="text-xs text-muted-foreground">{ROLE_LABEL[r.role] ?? r.role}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Metric label="Non Connected" value={r.nonConnected} warn={r.nonConnected > 0} href="/dashboard/admin/non-connected-clients" />
                <Metric label="Missed Shares" value={r.missedWeeklyShares} warn={r.missedWeeklyShares > 0} href="/dashboard/admin/missed-weekly-shares" />
                <Metric label="Overdue Calls" value={r.overdueWelcomeCalls} warn={r.overdueWelcomeCalls > 0} href="/dashboard/admin/overdue-welcome-calls" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
