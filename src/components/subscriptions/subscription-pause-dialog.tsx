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
import { Input } from "@/components/ui/input";
import { pauseSubscriptionAction } from "@/actions/subscriptions/subscription.actions";

export function SubscriptionPauseDialog({
  subscriptionId,
  profileName,
  open,
  onOpenChange,
}: {
  subscriptionId: string;
  profileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDays("");
      setReason("");
      setError(null);
    }
  }, [open]);

  function submit() {
    setError(null);
    const parsed = parseInt(days, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setError("Enter a valid number of days (1 or more).");
      return;
    }
    if (!reason.trim()) {
      setError("Enter a reason for the pause.");
      return;
    }
    startTransition(async () => {
      try {
        await pauseSubscriptionAction(subscriptionId, parsed, reason.trim());
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
          <DialogTitle>Pause Service</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Client Name</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{profileName}</div>
          </div>

          <div className="space-y-2">
            <Label>
              Number of Days to Pause <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="e.g. 7"
            />
            <p className="text-xs text-muted-foreground">
              The subscription&apos;s end date will be extended by this many days when service is resumed.
            </p>
          </div>

          <div className="space-y-2">
            <Label>
              Reason <span className="text-destructive">*</span>
            </Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. client travelling, requested a break"
            />
          </div>

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !days || !reason.trim()}>
            {isPending ? "Pausing..." : "Pause Service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
