"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EmployeeQualityRow } from "@/lib/stats/sme-rollup";

const ROLE_LABEL: Record<string, string> = { SERVICE: "Service", SERVICE_TL: "Team Lead", SERVICE_MANAGER: "Manager" };
const ROLE_FILTERS = ["All", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"] as const;
const ROLE_FILTER_LABEL: Record<(typeof ROLE_FILTERS)[number], string> = {
  All: "All",
  SERVICE: "Service",
  SERVICE_TL: "Service TL",
  SERVICE_MANAGER: "Service Manager",
};

type Row = EmployeeQualityRow & { isOwnTeam: boolean };

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

export function SmeQualityView({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState<(typeof ROLE_FILTERS)[number]>("All");

  const orgRows = rows.filter((r) => !r.isOwnTeam);
  const totals = orgRows.reduce(
    (acc, r) => ({
      nonConnected: acc.nonConnected + r.nonConnected,
      missedWeeklyShares: acc.missedWeeklyShares + r.missedWeeklyShares,
      overdueWelcomeCalls: acc.overdueWelcomeCalls + r.overdueWelcomeCalls,
    }),
    { nonConnected: 0, missedWeeklyShares: 0, overdueWelcomeCalls: 0 }
  );

  const visibleRows = filter === "All" ? rows : rows.filter((r) => r.role === filter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Service Quality Oversight</h2>
        <p className="text-sm text-muted-foreground">
          How every Service employee is doing on client contact, weekly shares, and welcome calls. Totals below exclude your own team.
        </p>
      </div>

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
        <CardHeader className="space-y-3">
          <div>
            <CardTitle className="text-base">By Employee</CardTitle>
            <p className="text-sm text-muted-foreground">Sorted by total flagged items — highest first. Your own team is highlighted.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {ROLE_FILTER_LABEL[f]}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleRows.length === 0 && <p className="text-sm text-muted-foreground">No matching employees found.</p>}
          {visibleRows.map((r) => (
            <div
              key={r.employeeId}
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
                r.isOwnTeam && "border-violet-300 bg-violet-50/60"
              )}
            >
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {r.employeeName}
                  {r.isOwnTeam && (
                    <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">Your Team</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{ROLE_LABEL[r.role] ?? r.role}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Metric label="Non Connected" value={r.nonConnected} warn={r.nonConnected > 0} href={`/dashboard/admin/non-connected-clients?assignedTo=${r.employeeId}`} />
                <Metric label="Missed Shares" value={r.missedWeeklyShares} warn={r.missedWeeklyShares > 0} href={`/dashboard/admin/missed-weekly-shares?assignedTo=${r.employeeId}`} />
                <Metric label="Overdue Calls" value={r.overdueWelcomeCalls} warn={r.overdueWelcomeCalls > 0} href={`/dashboard/admin/overdue-welcome-calls?assignedTo=${r.employeeId}`} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
