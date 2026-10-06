"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SearchableSelectField } from "@/app/(dashboard)/dashboard/admin/profiles/tabs/searchable-select-field";
import {
  getActivePlansForRenewal,
  getEmployeesForRenewal,
  getRenewalDefaultsAction,
  renewOrExtendSubscriptionAction,
  extendSubscriptionDaysAction,
} from "@/actions/subscriptions/renew-subscription.actions";

type Plan = {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  currency: string;
};

type Employee = {
  id: string;
  name: string;
  role: string;
};

type Defaults = {
  suggestedStart: string;
  runningEnd: string | null;
  extendEnd: string | null;
};

type Mode = "renew" | "extend";

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CARD", "PAYPAL", "PAYU", "OTHER"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetweenInclusive(start: string, end: string) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1;
}

function fmt(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function SubscriptionRenewDialog({
  profileId,
  profileName,
  open,
  onOpenChange,
  onRenewed,
}: {
  profileId: string;
  profileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenewed?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("renew");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [planId, setPlanId] = useState<string>("");
  const [soldById, setSoldById] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [bonusDays, setBonusDays] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTouched, setEndTouched] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [extendDays, setExtendDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const plan = plans.find((p) => p.id === planId);
  const bonus = Math.max(0, Math.floor(Number(bonusDays) || 0));
  const extra = Math.floor(Number(extendDays) || 0);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setMode("renew");
    setEndTouched(false);
    setBonusDays("0");
    setExtendDays("");
    setDataLoading(true);
    Promise.all([getActivePlansForRenewal(), getEmployeesForRenewal(), getRenewalDefaultsAction(profileId)])
      .then(([plansData, employeesData, defaultsData]) => {
        setPlans(plansData);
        setEmployees(employeesData);
        setDefaults(defaultsData);
        setStartDate(defaultsData.suggestedStart);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load form data."))
      .finally(() => setDataLoading(false));
  }, [open, profileId]);

  // End date follows plan days + bonus days until the user edits it by hand.
  useEffect(() => {
    if (endTouched || !plan || !startDate) return;
    setEndDate(addDaysISO(startDate, plan.durationDays + bonus - 1));
  }, [endTouched, plan, startDate, bonus]);

  function handlePlanChange(id: string) {
    setPlanId(id);
    const p = plans.find((x) => x.id === id);
    if (p) {
      setAmount(String(p.price));
      setCurrency(p.currency === "USD" ? "USD" : "INR");
    }
  }

  function resetForm() {
    setPlanId("");
    setSoldById("");
    setAmount("");
    setTransactionId("");
    setNotes("");
    setBonusDays("0");
    setEndDate("");
    setEndTouched(false);
    setExtendDays("");
  }

  function handleRenew() {
    setError(null);
    if (!planId) return setError("Select a plan.");
    if (!soldById) return setError("Select who this renewal should be credited to.");
    const amt = Number(amount);
    if (Number.isNaN(amt) || amt < 0) return setError("Enter a valid amount.");
    if (!startDate || !endDate) return setError("Choose the start and end dates.");
    if (endDate < startDate) return setError("End date cannot be before the start date.");
    if (bonus > 365) return setError("Bonus days cannot be more than 365.");
    startTransition(async () => {
      try {
        await renewOrExtendSubscriptionAction({
          profileId,
          planId,
          amount: amt,
          method,
          currency,
          soldById,
          transactionId: transactionId || undefined,
          notes: notes || undefined,
          startDate,
          endDate,
          bonusDays: bonus,
        });
        onOpenChange(false);
        resetForm();
        onRenewed?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to renew service.");
      }
    });
  }

  function handleExtend() {
    setError(null);
    if (extra < 1 || extra > 365) return setError("Enter between 1 and 365 days.");
    startTransition(async () => {
      try {
        await extendSubscriptionDaysAction({ profileId, days: extra });
        onOpenChange(false);
        resetForm();
        onRenewed?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to extend service.");
      }
    });
  }

  const newEnd = defaults?.extendEnd && extra > 0 ? addDaysISO(defaults.extendEnd, extra) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Renew / Extend Service — {profileName}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-lg border p-1">
          <Button
            type="button"
            variant={mode === "renew" ? "default" : "ghost"}
            onClick={() => {
              setMode("renew");
              setError(null);
            }}
          >
            Renew
          </Button>
          <Button
            type="button"
            variant={mode === "extend" ? "default" : "ghost"}
            onClick={() => {
              setMode("extend");
              setError(null);
            }}
          >
            Extend
          </Button>
        </div>

        {mode === "renew" ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              The client is buying a plan. Payment is recorded. Add free bonus days for offers like 6+1 months.
            </p>
            {defaults?.runningEnd && (
              <p className="rounded-md bg-muted px-3 py-2 text-xs">
                Current service runs until <strong>{fmt(defaults.runningEnd)}</strong>. The renewal starts after it.
              </p>
            )}

            <div>
              <Label>Plan</Label>
              <Select value={planId} onValueChange={handlePlanChange} disabled={dataLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={dataLoading ? "Loading plans..." : "Select a plan"} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.currency === "USD" ? "$" : "₹"}
                      {p.price.toLocaleString("en-IN")}, {p.durationDays}d)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <SearchableSelectField
                name="soldById"
                label="Sold By"
                value={soldById}
                onValueChange={setSoldById}
                options={employees.map((e) => ({ id: e.id, name: `${e.name} (${e.role})` }))}
                placeholder={dataLoading ? "Loading employees..." : "Who gets credit for this renewal?"}
                required
              />
            </div>

            <div>
              <Label>Free bonus days (offer, optional)</Label>
              <Input
                type="number"
                min="0"
                max="365"
                value={bonusDays}
                onChange={(e) => setBonusDays(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>End date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setEndTouched(true);
                  }}
                />
              </div>
            </div>
            {plan && startDate && endDate && endDate >= startDate && (
              <p className="text-xs text-muted-foreground">
                {daysBetweenInclusive(startDate, endDate)} days of service (plan {plan.durationDays}
                {bonus > 0 ? ` + ${bonus} free` : ""}).{" "}
                {endTouched && (
                  <button type="button" className="underline" onClick={() => setEndTouched(false)}>
                    Reset end date to automatic
                  </button>
                )}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount</Label>
                <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as "INR" | "USD")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as (typeof PAYMENT_METHODS)[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Transaction ID (optional)</Label>
              <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Give the client extra days on the running service. No payment is recorded.
            </p>

            {defaults?.extendEnd ? (
              <p className="rounded-md bg-muted px-3 py-2 text-xs">
                Service currently ends on <strong>{fmt(defaults.extendEnd)}</strong>.
              </p>
            ) : (
              !dataLoading && (
                <p className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-800">
                  There is no running service to extend. If the service has expired, use Renew and set the amount to 0.
                </p>
              )
            )}

            <div>
              <Label>Extra days</Label>
              <Input
                type="number"
                min="1"
                max="365"
                placeholder="e.g. 7"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {[3, 7, 15, 30].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setExtendDays(String(n))}
                  >
                    +{n}
                  </Button>
                ))}
              </div>
            </div>

            {newEnd && (
              <p className="text-sm">
                New end date: <strong>{fmt(newEnd)}</strong>
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          {mode === "renew" ? (
            <Button onClick={handleRenew} disabled={isPending || dataLoading}>
              {isPending ? "Saving..." : "Confirm Renewal"}
            </Button>
          ) : (
            <Button
              onClick={handleExtend}
              disabled={isPending || dataLoading || !defaults?.extendEnd || extra < 1}
            >
              {isPending ? "Saving..." : extra > 0 ? `Extend by ${extra} days` : "Extend"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
