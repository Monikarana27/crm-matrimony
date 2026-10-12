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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { editSubscriptionAction } from "@/actions/subscriptions/subscription.actions";
import { getActivePlansForRenewal } from "@/actions/subscriptions/renew-subscription.actions";

type PlanOption = { id: string; name: string };

function toIstDay(d: Date | string | null): string {
  if (!d) return "";
  return new Date(new Date(d).getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function SubscriptionEditDialog({
  subscriptionId,
  profileName,
  currentPlanId,
  currentPlanName,
  startDate,
  endDate,
  open,
  onOpenChange,
}: {
  subscriptionId: string;
  profileName: string;
  currentPlanId: string;
  currentPlanName: string;
  startDate: Date | string;
  endDate: Date | string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [planId, setPlanId] = useState(currentPlanId);
  const [start, setStart] = useState(toIstDay(startDate));
  const [end, setEnd] = useState(toIstDay(endDate));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPlanId(currentPlanId);
    setStart(toIstDay(startDate));
    setEnd(toIstDay(endDate));
    setError(null);
    getActivePlansForRenewal()
      .then((list) => {
        const options: PlanOption[] = list.map((p) => ({ id: p.id, name: p.name }));
        if (!options.some((p) => p.id === currentPlanId)) {
          options.unshift({ id: currentPlanId, name: currentPlanName });
        }
        setPlans(options);
      })
      .catch(() => setError("Could not load plans."));
  }, [open, currentPlanId, currentPlanName, startDate, endDate]);

  const durationDays =
    start && end
      ? Math.round(
          (new Date(end + "T00:00:00Z").getTime() - new Date(start + "T00:00:00Z").getTime()) /
            86400000
        )
      : null;

  function submit() {
    setError(null);
    if (!planId || !start || !end) {
      setError("Plan, start date and end date are all required.");
      return;
    }
    startTransition(async () => {
      try {
        await editSubscriptionAction(subscriptionId, { planId, startDate: start, endDate: end });
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
          <DialogTitle>Edit Subscription</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Client Name</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{profileName}</div>
          </div>

          <div className="space-y-2">
            <Label>
              Plan <span className="text-destructive">*</span>
            </Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>
                End Date <span className="text-destructive">*</span>
              </Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          {durationDays !== null && (
            <p className="text-xs text-muted-foreground">
              {durationDays > 0
                ? `${durationDays} days between start and end.`
                : "End date must be after the start date."}{" "}
              Changing the plan does not move the dates, so set them yourself.
            </p>
          )}

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !planId || !start || !end}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
