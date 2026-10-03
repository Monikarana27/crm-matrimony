"use client";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { MyFollowUpEntry } from "@/lib/stats/sme-follow-ups";
import { markSmeFollowUpDoneAction } from "@/actions/sme/sme-follow-up.actions";

type Filter = "all" | "overdue" | "today";

function fmtDue(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Follow-up dates are stored verbatim (literal digits in a UTC-labeled field),
// so "today" is compared against the current IST calendar date.
function todayVerbatim() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function splitNote(f: MyFollowUpEntry) {
  const m = f.note.match(/^PP request follow-up — (.*?\)):\s*([\s\S]*)$/);
  if (m) return { title: m[1], body: m[2] };
  const title = f.clientProfileCode ? `${f.clientName ?? "Client"} · ${f.clientProfileCode}` : "Follow-up";
  return { title, body: f.note };
}

export function MyFollowUpsCard({ items }: { items: MyFollowUpEntry[] }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = todayVerbatim();
  const isToday = (f: MyFollowUpEntry) =>
    !f.isOverdue && !!f.followUpDate && new Date(f.followUpDate).toISOString().slice(0, 10) === today;

  const overdueCount = items.filter((f) => f.isOverdue).length;
  const todayCount = items.filter(isToday).length;

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        const ad = a.followUpDate ? new Date(a.followUpDate).getTime() : Infinity;
        const bd = b.followUpDate ? new Date(b.followUpDate).getTime() : Infinity;
        if (ad !== bd) return ad - bd;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [items]
  );

  const visible = sorted.filter((f) =>
    filter === "overdue" ? f.isOverdue : filter === "today" ? isToday(f) : true
  );

  function handleDone(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await markSmeFollowUpDoneAction(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const filterBtn = (key: Filter, label: string) => (
    <Button
      key={key}
      type="button"
      size="sm"
      variant={filter === key ? "default" : "outline"}
      onClick={() => setFilter(key)}
    >
      {label}
    </Button>
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-card px-5 py-3">
        <div>
          <p className="text-base font-semibold">Follow-ups for you</p>
          <p className="text-xs text-muted-foreground">Flagged by your SME. Open the list to work through them.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border bg-muted px-3 py-1">
            Pending <strong>{items.length}</strong>
          </span>
          {overdueCount > 0 && (
            <span className="rounded-full border border-red-300 bg-red-100 px-3 py-1 text-red-700">
              Overdue <strong>{overdueCount}</strong>
            </span>
          )}
          {todayCount > 0 && (
            <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-amber-800">
              Due today <strong>{todayCount}</strong>
            </span>
          )}
          <Button size="sm" onClick={() => setOpen(true)}>
            View all
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Follow-ups for you ({items.length})</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {filterBtn("all", `All (${items.length})`)}
            {filterBtn("overdue", `Overdue (${overdueCount})`)}
            {filterBtn("today", `Due today (${todayCount})`)}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="space-y-3">
            {visible.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing in this view.</p>
            )}
            {visible.map((f) => {
              const { title, body } = splitNote(f);
              return (
                <div
                  key={f.id}
                  className={cn("space-y-2 rounded-md border p-3", f.isOverdue && "border-red-300")}
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{title}</span>
                    {f.isOverdue && (
                      <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs text-red-700">
                        Overdue
                      </span>
                    )}
                    {f.followUpDate && (
                      <span className="text-xs text-muted-foreground">Due {fmtDue(f.followUpDate)}</span>
                    )}
                    <span className="text-xs text-muted-foreground">From {f.fromName}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{body}</p>
                  <Button size="sm" disabled={isPending} onClick={() => handleDone(f.id)}>
                    Mark done
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
