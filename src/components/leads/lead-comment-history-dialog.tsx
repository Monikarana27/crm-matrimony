"use client";

import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getLeadTimeline } from "@/actions/leads/lead-remark.actions";
import { LeadTimelineList, type TimelineEntry } from "./lead-timeline-list";

export function LeadCommentHistoryDialog({
  leadId,
  leadName,
  legacyNotes,
  open,
  onOpenChange,
}: {
  leadId: string;
  leadName: string;
  legacyNotes: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [timeline, setTimeline] = useState<TimelineEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reload every time the dialog opens (the old code only loaded on the dialog's own
  // open event, which never fires when a menu item opens it).
  useEffect(() => {
    let cancelled = false;
    if (open) {
      setTimeline(null);
      setError(null);
      getLeadTimeline(leadId)
        .then((data) => {
          if (!cancelled) setTimeline(data as TimelineEntry[]);
        })
        .catch(() => {
          if (!cancelled) setError("Could not load comment history.");
        });
    }
    return () => {
      cancelled = true;
    };
  }, [open, leadId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4" />
            Comment History — {leadName}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[28rem] overflow-y-auto pr-1">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!error && timeline === null && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!error && timeline !== null && <LeadTimelineList entries={timeline} legacyNotes={legacyNotes} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
