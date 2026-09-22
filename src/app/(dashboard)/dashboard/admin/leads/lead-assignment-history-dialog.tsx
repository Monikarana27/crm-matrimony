"use client";

import { useState, useTransition } from "react";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLeadAssignmentHistory } from "@/actions/leads/lead.actions";

type HistoryEntry = {
  id: string;
  changedAt: Date;
  fromEmployee: { id: string; name: string } | null;
  toEmployee: { id: string; name: string } | null;
  changedBy: { id: string; name: string };
};

export function LeadAssignmentHistoryDialog({
  leadId,
  leadName,
  open,
  onOpenChange,
}: {
  leadId: string;
  leadName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next && history === null) {
      startTransition(async () => {
        const data = await getLeadAssignmentHistory(leadId);
        setHistory(data as HistoryEntry[]);
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Assignment History — {leadName}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {isPending && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}

          {!isPending && history !== null && history.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No assignment changes yet.
            </p>
          )}

          {!isPending &&
            history?.map((entry) => (
              <div
                key={entry.id}
                className="rounded-md border bg-muted/30 p-3 text-sm"
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <span>{entry.fromEmployee?.name ?? "Unassigned"}</span>
                  <span className="text-muted-foreground">→</span>
                  <span>{entry.toEmployee?.name ?? "Unassigned"}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  by {entry.changedBy.name} ·{" "}
                  {new Date(entry.changedAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}