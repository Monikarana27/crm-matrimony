"use client";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FeedbackEntry } from "@/lib/stats/sme-feedback";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  ACCEPTED: { label: "Positive", className: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  REJECTED: { label: "Negative", className: "bg-red-100 text-red-700 border-red-300" },
  HOLD: { label: "On Hold", className: "bg-amber-100 text-amber-700 border-amber-300" },
  PENDING: { label: "Pending", className: "bg-muted text-muted-foreground border-border" },
  SENT: { label: "Sent", className: "bg-muted text-muted-foreground border-border" },
};

export function SmeFeedbackFeed({
  feed,
  employees,
}: {
  feed: FeedbackEntry[];
  employees: { id: string; name: string }[];
}) {
  const [employeeId, setEmployeeId] = useState<string>("all");

  const filtered = useMemo(
    () => (employeeId === "all" ? feed : feed.filter((f) => f.employeeId === employeeId)),
    [feed, employeeId]
  );

  const totals = useMemo(
    () => ({
      total: filtered.length,
      positive: filtered.filter((f) => f.status === "ACCEPTED").length,
      negative: filtered.filter((f) => f.status === "REJECTED").length,
    }),
    [filtered]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Client Feedback</h2>
        <p className="text-sm text-muted-foreground">Client feedback on shared profiles from the last 30 days, by employee.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Feedback</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">{totals.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Positive</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums text-emerald-600">{totals.positive}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Negative</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums text-red-600">{totals.negative}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Recent Feedback</CardTitle>
            <p className="text-sm text-muted-foreground">Most recent first.</p>
          </div>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No feedback in the last 30 days.</p>}
          {filtered.map((f) => {
            const style = f.status ? STATUS_STYLE[f.status] : null;
            return (
              <div key={f.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{f.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      on {f.candidateName} ({f.candidateProfileCode}) · {f.employeeName ?? "Unassigned"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {style && (
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", style.className)}>
                        {style.label}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {f.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
                {f.feedback && <p className="mt-2 text-sm text-muted-foreground">{f.feedback}</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
