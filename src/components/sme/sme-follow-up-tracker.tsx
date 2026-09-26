"use client";
import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SmeFollowUpEntry } from "@/lib/stats/sme-follow-ups";
import {
  createSmeFollowUpAction,
  toggleSmeFollowUpResolvedAction,
  deleteSmeFollowUpAction,
} from "@/actions/sme/sme-follow-up.actions";

type StatusFilter = "open" | "resolved" | "all";

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function fmtDue(d: Date | string) {
  const date = new Date(d);
  const isMidnight =
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(isMidnight ? {} : { hour: "numeric", minute: "2-digit" }),
    timeZone: "UTC",
  });
}
function fmtCreated(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function SmeFollowUpTracker({
  followUps,
  employees,
}: {
  followUps: SmeFollowUpEntry[];
  employees: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // add form
  const [formEmployee, setFormEmployee] = useState<string>("");
  const [formClientCode, setFormClientCode] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formDate, setFormDate] = useState("");

  // filters
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");

  const scoped = useMemo(
    () => (employeeFilter === "all" ? followUps : followUps.filter((f) => f.employeeId === employeeFilter)),
    [followUps, employeeFilter]
  );

  const totals = useMemo(
    () => ({
      open: scoped.filter((f) => !f.resolvedAt).length,
      overdue: scoped.filter((f) => f.isOverdue).length,
      resolved: scoped.filter((f) => !!f.resolvedAt).length,
    }),
    [scoped]
  );

  const visible = useMemo(() => {
    const rows = scoped.filter((f) =>
      statusFilter === "all" ? true : statusFilter === "open" ? !f.resolvedAt : !!f.resolvedAt
    );
    return [...rows].sort((a, b) => {
      // open before resolved
      if (!!a.resolvedAt !== !!b.resolvedAt) return a.resolvedAt ? 1 : -1;
      if (!a.resolvedAt) {
        // overdue first
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        // then earliest due date, undated last
        const ad = a.followUpDate ? new Date(a.followUpDate).getTime() : Infinity;
        const bd = b.followUpDate ? new Date(b.followUpDate).getTime() : Infinity;
        if (ad !== bd) return ad - bd;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [scoped, statusFilter]);

  function handleAdd() {
    setError(null);
    if (!formEmployee) return setError("Pick an employee");
    if (!formNote.trim()) return setError("Write a note");
    startTransition(async () => {
      try {
        await createSmeFollowUpAction({
          employeeId: formEmployee,
          note: formNote,
          followUpDate: formDate || null,
          clientProfileCode: formClientCode || null,
        });
        setFormNote("");
        setFormDate("");
        setFormClientCode("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleToggle(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await toggleSmeFollowUpResolvedAction(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this follow-up? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteSmeFollowUpAction(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log a follow-up</CardTitle>
          <p className="text-xs text-muted-foreground">
            The employee sees this on their dashboard, gets notified, and can mark it done.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={formEmployee} onValueChange={(v) => setFormEmployee(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Employee (required)" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              className={fieldClass}
              placeholder="Client profile code (optional)"
              value={formClientCode}
              onChange={(e) => setFormClientCode(e.target.value)}
            />
            <input
              type="datetime-local"
              className={fieldClass}
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              aria-label="Follow-up date and time"
            />
          </div>
          <textarea
            className={cn(fieldClass, "min-h-[80px]")}
            placeholder="What did you flag, and what will you follow up on?"
            value={formNote}
            onChange={(e) => setFormNote(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleAdd} disabled={isPending}>
            {isPending ? "Saving..." : "Add follow-up"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{totals.open}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className={cn("text-2xl font-semibold", totals.overdue > 0 && "text-red-600")}>
              {totals.overdue}
            </p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{totals.resolved}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Select value={employeeFilter} onValueChange={(v) => setEmployeeFilter(v ?? "all")}>
            <SelectTrigger>
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {(["open", "resolved", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs capitalize",
                statusFilter === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing here.</p>
        )}
        {visible.map((f) => (
          <Card key={f.id} className={cn(f.isOverdue && "border-red-300")}>
            <CardContent className="space-y-2 pt-6">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{f.employeeName}</span>
                {f.clientProfileCode && (
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                    {f.clientName ?? "Client"} · {f.clientProfileCode}
                  </span>
                )}
                {f.resolvedAt ? (
                  <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                    {f.resolvedByName ? `Done by ${f.resolvedByName}` : "Resolved"}
                  </span>
                ) : f.isOverdue ? (
                  <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    Overdue
                  </span>
                ) : null}
                {f.followUpDate && (
                  <span className="text-xs text-muted-foreground">Due {fmtDue(f.followUpDate)}</span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  Logged {fmtCreated(f.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{f.note}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleToggle(f.id)}
                >
                  {f.resolvedAt ? "Reopen" : "Mark resolved"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleDelete(f.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
