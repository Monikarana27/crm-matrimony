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
import { addSubscriptionCommentAction } from "@/actions/subscriptions/subscription-comment.actions";

function toDatetimeLocalValue(d: Date | null): string {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function SubscriptionAddCommentDialog({
  subscriptionId,
  profileName,
  currentFollowUpDate,
  open,
  onOpenChange,
}: {
  subscriptionId: string;
  profileName: string;
  currentFollowUpDate: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [followUpDateTime, setFollowUpDateTime] = useState(toDatetimeLocalValue(currentFollowUpDate));
  const [remark, setRemark] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFollowUpDateTime(toDatetimeLocalValue(currentFollowUpDate));
      setRemark("");
      setError(null);
    }
  }, [open, currentFollowUpDate]);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addSubscriptionCommentAction(subscriptionId, remark, followUpDateTime || null);
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
          <DialogTitle>Update Follow-up</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Client Name</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{profileName}</div>
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
            <Label>
              Remark <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
            />
          </div>

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !remark.trim()}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
