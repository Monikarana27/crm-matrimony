"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addLeadQuickUpdateAction, getLeadTimeline } from "@/actions/leads/lead-remark.actions";
import { resolveLeadProfileAction } from "@/actions/leads/lead-profile-link.actions";
import { LEAD_STATUS_OPTIONS, LEAD_STATUS_LABELS } from "@/lib/leads/lead-status";
import { LeadTimelineList, type TimelineEntry } from "./lead-timeline-list";

const OUTCOME_TEXT: Record<string, string> = {
  INTERESTED: "text-green-700",
  FOLLOW_UP: "text-amber-700",
  NOT_INTERESTED: "text-red-700",
  DNP: "text-gray-500",
};

type Latest = { remark: string | null; outcome: string; createdAt: Date } | undefined;

export function LeadCommentCell({
  leadId,
  leadName,
  currentStatus,
  currentFollowUpDate,
  latest,
  legacyNotes,
  variant = "comment",
}: {
  leadId: string;
  leadName: string;
  currentStatus: string;
  currentFollowUpDate: Date | null;
  latest: Latest;
  legacyNotes: string | null;
  variant?: "comment" | "name";
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [followUp, setFollowUp] = useState("");
  const [comment, setComment] = useState("");
  const [timeline, setTimeline] = useState<TimelineEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [isResolving, startResolve] = useTransition();

  const load = useCallback(async () => {
    try {
      const data = await getLeadTimeline(leadId);
      setTimeline(data as TimelineEntry[]);
    } catch {
      setError("Could not load comment history.");
    }
  }, [leadId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Lead name: open the profile if this lead has exactly one, otherwise the Comments box.
  function handleNameClick() {
    startResolve(async () => {
      try {
        const { profileId } = await resolveLeadProfileAction(leadId);
        if (profileId) {
          router.push(`/dashboard/admin/profiles/${profileId}`);
          return;
        }
      } catch {
        // fall through to the Comments box
      }
      openDialog();
    });
  }

  function openDialog() {
    setStatus(currentStatus);
    setFollowUp("");
    setComment("");
    setError(null);
    setTimeline(null);
    setOpen(true);
  }

  function submit() {
    if (!comment.trim()) {
      setError("Please write a comment.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        // datetime-local has no timezone: convert in the browser so the server stores the right instant
        const iso = followUp ? new Date(followUp).toISOString() : null;
        await addLeadQuickUpdateAction(leadId, status, iso, comment.trim());
        setComment("");
        setFollowUp("");
        await load();
      } catch {
        setError("Could not save. Please try again.");
      }
    });
  }

  return (
    <>
      {variant === "name" ? (
        <button type="button" onClick={handleNameClick} disabled={isResolving} className="text-left font-medium text-primary hover:underline disabled:opacity-60">
          {leadName}
        </button>
      ) : (
      <button type="button" onClick={openDialog} className="group block max-w-[200px] text-left">
        {latest ? (
          <>
            <span className={`text-xs font-medium ${OUTCOME_TEXT[latest.outcome] ?? "text-muted-foreground"}`}>
              {latest.outcome.replace(/_/g, " ")}
            </span>
            <p className="truncate text-sm text-muted-foreground group-hover:underline">
              {latest.remark || "Add a comment..."}
            </p>
          </>
        ) : legacyNotes ? (
          <>
            <span className="text-xs font-medium text-muted-foreground">Website note</span>
            <p className="truncate text-sm text-muted-foreground group-hover:underline">{legacyNotes}</p>
          </>
        ) : (
          <span className="flex items-center gap-1 text-sm italic text-muted-foreground group-hover:underline">
            <Pencil className="h-3 w-3" /> Add comment
          </span>
        )}
      </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comments — {leadName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {LEAD_STATUS_LABELS[opt]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Next follow-up (optional)</label>
                <input
                  type="datetime-local"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  className="h-10 w-full rounded-md border border-input px-3 text-sm"
                />
              </div>
            </div>
            {currentFollowUpDate && (
              <p className="text-xs text-muted-foreground">
                Current follow-up: {new Date(currentFollowUpDate).toLocaleDateString("en-IN")}
              </p>
            )}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comment..."
              rows={3}
              className="w-full rounded-md border border-input px-2 py-1.5 text-sm"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={isPending} onClick={submit}>
              {isPending ? "Saving..." : "Add Comment"}
            </Button>
          </div>

          <div className="space-y-2 border-t pt-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</h4>
            <div className="max-h-56 overflow-y-auto pr-1">
              {timeline === null ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <LeadTimelineList entries={timeline} legacyNotes={legacyNotes} />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
