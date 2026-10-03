"use client";

import { useActionState, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { setSalesTargetAction, getEmployeeTargetHistory } from "@/actions/sales-targets/sales-target.actions";
import { useTransition } from "react";
import { ViewAsButton } from "@/components/shared/view-as-button";
import Link from "next/link";

type TargetData = {
  employee: { id: string; name: string; role: string };
  targetAmount: number | null;
  achievedAmount: number;
};
function TargetCard({
  data,
  month,
  year,
  isImpersonating,
}: {
  data: TargetData;
  month: number;
  year: number;
  isImpersonating: boolean;
}) {
  const [state, formAction, isPending] = useActionState(setSalesTargetAction, { error: null });
  const [editing, setEditing] = useState(!data.targetAmount);

  const pct =
    data.targetAmount && data.targetAmount > 0
      ? Math.min((data.achievedAmount / data.targetAmount) * 100, 100)
      : 0;

  return (
    <Card>
     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">
            <Link href={`/dashboard/admin/employees/${data.employee.id}/edit`} className="hover:underline">
              {data.employee.name}
            </Link>
          </CardTitle>
          <p className="text-xs text-muted-foreground">{month}/{year}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              pct >= 100
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-amber-100 text-amber-700 border-amber-200"
            }
          >
            {pct >= 100 ? "Achieved" : "In Progress"}
          </Badge>
          {!isImpersonating && <ViewAsButton userId={data.employee.id} />}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="userId" value={data.employee.id} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="year" value={year} />
            <div className="space-y-1.5">
              <Label htmlFor={`target-${data.employee.id}`} className="text-xs">
                Target Amount (₹)
              </Label>
              <Input
                id={`target-${data.employee.id}`}
                name="targetAmount"
                type="number"
                defaultValue={data.targetAmount ?? ""}
                placeholder="200000"
                required
              />
            </div>
            {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Saving..." : "Save Target"}
              </Button>
              {data.targetAmount !== null && (
                <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Target</span>
              <span className="font-semibold tabular-nums">
                ₹{data.targetAmount?.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Achieved</span>
              <span className="font-semibold tabular-nums text-emerald-600">
                ₹{data.achievedAmount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit Target
            </Button>
            <TargetHistory employeeId={data.employee.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type HistoryRow = {
  month: number;
  year: number;
  targetAmount: number | null;
  achievedAmount: number;
};

function TargetHistory({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (rows === null) {
      startTransition(async () => {
        const data = await getEmployeeTargetHistory(employeeId);
        setRows(data);
      });
    }
  }

  return (
    <div className="pt-1">
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={toggle}>
        {open ? "Hide History" : "View History"}
      </Button>
      {open && (
        <div className="mt-2 space-y-1.5 rounded-md border bg-muted/30 p-2">
          {isPending && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!isPending && rows && rows.length === 0 && (
            <p className="text-xs text-muted-foreground">No history yet.</p>
          )}
          {!isPending &&
            rows &&
            rows.map((r) => {
              const pct =
                r.targetAmount && r.targetAmount > 0
                  ? Math.min((r.achievedAmount / r.targetAmount) * 100, 100)
                  : 0;
              const label = new Date(r.year, r.month - 1).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              });
              return (
                <div key={`${r.year}-${r.month}`} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums">
                    {r.targetAmount !== null ? (
                      <>
                        ₹{r.achievedAmount.toLocaleString("en-IN")} / ₹
                        {r.targetAmount.toLocaleString("en-IN")} ({pct.toFixed(0)}%)
                      </>
                    ) : (
                      <>₹{r.achievedAmount.toLocaleString("en-IN")} (no target set)</>
                    )}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export function SalesTargetsGrid({
  targets,
  selectedMonth,
  selectedYear,
  isImpersonating,
}: {
  targets: TargetData[];
  selectedMonth: number;
  selectedYear: number;
  isImpersonating: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {targets.map((data) => (
        <TargetCard
          key={data.employee.id}
          data={data}
          month={selectedMonth}
          year={selectedYear}
          isImpersonating={isImpersonating}
        />
      ))}
    </div>
  );
}