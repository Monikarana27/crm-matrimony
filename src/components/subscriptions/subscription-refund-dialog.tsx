"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { markForRefundAction } from "@/actions/subscriptions/refund.actions";

export function SubscriptionRefundDialog({
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
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await markForRefundAction(subscriptionId, reason);
      if (res?.error) {
        setError(res.error);
        return;
      }
      toast.success(profileName + " marked for refund");
      setReason("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process refund: {profileName}</DialogTitle>
          <DialogDescription>
            The client will be removed from Ongoing Services and appear in the admin Refund Clients table.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Why is this client getting a refund? (required)</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. Not satisfied with the profiles shared, service not as promised..."
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || reason.trim().length < 5}>
            {isPending ? "Saving..." : "Process Refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
