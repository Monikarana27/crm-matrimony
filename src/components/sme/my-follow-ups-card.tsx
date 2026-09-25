"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MyFollowUpEntry } from "@/lib/stats/sme-follow-ups";
import { markSmeFollowUpDoneAction } from "@/actions/sme/sme-follow-up.actions";

function fmtDue(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function MyFollowUpsCard({ items }: { items: MyFollowUpEntry[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Card className="mb-6 border-amber-300">
      <CardHeader>
        <CardTitle className="text-base">
          Follow-ups for you ({items.length})
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Flagged by your SME. Complete the work, then mark it done.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {items.map((f) => (
          <div
            key={f.id}
            className={cn("space-y-2 rounded-md border p-3", f.isOverdue && "border-red-300")}
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">From {f.fromName}</span>
              {f.clientProfileCode && (
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                  {f.clientName ?? "Client"} · {f.clientProfileCode}
                </span>
              )}
              {f.isOverdue && (
                <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs text-red-700">
                  Overdue
                </span>
              )}
              {f.followUpDate && (
                <span className="text-xs text-muted-foreground">Due {fmtDue(f.followUpDate)}</span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm">{f.note}</p>
            <Button size="sm" disabled={isPending} onClick={() => handleDone(f.id)}>
              Mark done
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
