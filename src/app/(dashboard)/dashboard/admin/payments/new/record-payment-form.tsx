"use client";

import { useActionState, useState, useMemo } from "react";
import Link from "next/link";
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
import { Card, CardContent } from "@/components/ui/card";
import { SearchableSelectField } from "@/app/(dashboard)/dashboard/admin/profiles/tabs/searchable-select-field";
import { ArrowLeft } from "lucide-react";

type subscription = {
  id: string;
  profile: { id: string; name: string; profileCode: string };
  plan: { id: string; name: string; price: number };
};

type Employee = { id: string; name: string; role: string };

const METHOD_OPTIONS = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "PAYU", "PAYPAL", "OTHER"];
const STATUS_OPTIONS = ["PAID", "PENDING", "FAILED"];

interface RecordPaymentFormProps {
  subscriptions: subscription[];
  employees: Employee[];
  action: (prevState: unknown, formData: FormData) => Promise<{ error: string | null }>;
}

export function RecordPaymentForm({ subscriptions, employees, action }: RecordPaymentFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [subscriptionId, setsubscriptionId] = useState("");
  const [soldById, setSoldById] = useState("");
  const [method, setMethod] = useState("OTHER");
  const [status, setStatus] = useState("PENDING");
  const [currency, setCurrency] = useState("INR");
  

  const selectedsubscription = useMemo(
    () => subscriptions.find((s) => s.id === subscriptionId),
    [subscriptionId, subscriptions]
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <SearchableSelectField
                name="subscriptionId"
                label="subscription"
                value={subscriptionId}
                onValueChange={setsubscriptionId}
                options={subscriptions.map((s) => ({
                  id: s.id,
                  name: `${s.profile.name} (${s.profile.profileCode}) — ${s.plan.name}`,
                }))}
                placeholder="Select a subscription"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({currency === "USD" ? "$" : "₹"})</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                defaultValue={selectedsubscription?.plan.price}
                placeholder="25000"
                required
              />
            </div>

            <div>
              <SearchableSelectField
                name="soldById"
                label="Sold By"
                value={soldById}
                onValueChange={setSoldById}
                options={employees.map((e) => ({ id: e.id, name: `${e.name} (${e.role})` }))}
                placeholder="Who closed this sale?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="currency" value={currency} />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="method" value={method} />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="status" value={status} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionId">Transaction ID (optional)</Label>
              <Input id="transactionId" name="transactionId" placeholder="e.g. PAYU-TXN-12345" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending || !subscriptionId || !soldById}>
              {isPending ? "Recording..." : "Record Payment"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/admin/payments">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
