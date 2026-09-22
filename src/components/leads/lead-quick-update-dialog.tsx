"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { addLeadQuickUpdateAction } from "@/actions/leads/lead-remark.actions";
import { LEAD_STATUS_OPTIONS, LEAD_STATUS_LABELS } from "@/lib/leads/lead-status";

function toDatetimeLocalValue(d: Date | null): string {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LeadQuickUpdateDialog({
  leadId,
  leadName,
  currentStatus,
  currentFollowUpDate,
  open,
  onOpenChange,
}: {
  leadId: string;
  leadName: string;
  currentStatus: string;
  currentFollowUpDate: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [followUpDateTime, setFollowUpDateTime] = useState(toDatetimeLocalValue(currentFollowUpDate));
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Re-sync fields whenever the dialog is (re)opened for a lead.
  useEffect(() => {
    if (open) {
      setStatus(currentStatus);
      setFollowUpDateTime(toDatetimeLocalValue(currentFollowUpDate));
      setComment("");
      setError(null);
    }
  }, [open, currentStatus, currentFollowUpDate]);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addLeadQuickUpdateAction(leadId, status, followUpDateTime || null, comment);
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Update</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Lead</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{leadName}</div>
          </div>

          <div className="space-y-2">
            <Label>
              Status <span className="text-destructive">*</span>
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{LEAD_STATUS_LABELS[opt]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Follow-up Date &amp; Time</Label>
            <input
              type="datetime-local"
              value={followUpDateTime}
              onChange={(e) => setFollowUpDateTime(e.target.value)}
              className="h-10 w-full rounded-md border border-input px-3 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Comment</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What happened on this follow-up?"
              rows={3}
            />
          </div>

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
