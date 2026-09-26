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
  renewOrExtendSubscriptionAction,
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

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CARD", "PAYPAL", "PAYU", "OTHER"] as const;

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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [planId, setPlanId] = useState<string>("");
  const [soldById, setSoldById] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDataLoading(true);
    Promise.all([getActivePlansForRenewal(), getEmployeesForRenewal()])
      .then(([plansData, employeesData]) => {
        setPlans(plansData);
        setEmployees(employeesData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load form data."))
      .finally(() => setDataLoading(false));
  }, [open]);

  function handlePlanChange(id: string) {
    setPlanId(id);
    const plan = plans.find((p) => p.id === id);
    if (plan) {
      setAmount(String(plan.price));
      setCurrency(plan.currency === "USD" ? "USD" : "INR");
    }
  }

  function handleSubmit() {
    setError(null);
    if (!planId) {
      setError("Select a plan.");
      return;
    }
    if (!soldById) {
      setError("Select who this renewal should be credited to.");
      return;
    }
    const amt = Number(amount);
    if (Number.isNaN(amt) || amt < 0) {
      setError("Enter a valid amount.");
      return;
    }
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
        });
        onOpenChange(false);
        setPlanId("");
        setSoldById("");
        setAmount("");
        setTransactionId("");
        setNotes("");
        onRenewed?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to renew service.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renew / Extend Service — {profileName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Plan</Label>
            <Select value={planId} onValueChange={handlePlanChange} disabled={dataLoading}>
              <SelectTrigger>
                <SelectValue placeholder={dataLoading ? "Loading plans..." : "Select a plan"} />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} ({plan.currency === "USD" ? "$" : "₹"}
                    {plan.price.toLocaleString("en-IN")}, {plan.durationDays}d)
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || dataLoading}>
            {isPending ? "Saving..." : "Confirm Renewal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
