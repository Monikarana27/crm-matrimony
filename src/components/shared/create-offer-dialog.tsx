"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createPaymentOfferAction } from "@/actions/payment-offers/payment-offer.actions";
import { Tag, Copy, ExternalLink, Check } from "lucide-react";

type Plan = { id: string; name: string; price: number };

export function CreateOfferDialog({ profileId, plans }: { profileId: string; plans: Plan[] }) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState("");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedPlan = plans.find((p) => p.id === planId);
  const discount = parseFloat(discountValue) || 0;
  const finalAmount = selectedPlan
    ? discountType === "PERCENTAGE"
      ? Math.max(selectedPlan.price - (selectedPlan.price * discount) / 100, 0)
      : Math.max(selectedPlan.price - discount, 0)
    : 0;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createPaymentOfferAction({
        profileId,
        planId,
        currency,
        discountType,
        discountValue: discount,
        expiresAt,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setResult({ token: res.token! });
    });
  }

  function reset() {
    setPlanId("");
    setDiscountValue("");
    setExpiresAt("");
    setError(null);
    setResult(null);
    setCopied(false);
  }

  const link = result ? `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${result.token}` : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tag className="mr-2 h-4 w-4" />
          Create Special Offer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{result ? "Special Offer Created" : "Create Special Offer"}</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Membership Plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — ₹{p.price.toLocaleString("en-IN")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency / Payment Gateway</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as "INR" | "USD")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR — via PayU</SelectItem>
                  <SelectItem value="USD">USD — via PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{discountType === "PERCENTAGE" ? "Discount %" : "Discount ₹"}</Label>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="h-10 w-full rounded-md border border-input px-3 text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Offer Expires At</Label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-10 w-full rounded-md border border-input px-3 text-sm"
              />
            </div>

            {selectedPlan && (
              <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Price</span>
                  <span>{currency === "USD" ? "$" : "₹"}{selectedPlan.price.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>−{currency === "USD" ? "$" : "₹"}{(selectedPlan.price - finalAmount).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Customer Pays</span>
                  <span>{currency === "USD" ? "$" : "₹"}{finalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}

            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

            <Button
              className="w-full"
              disabled={isPending || !planId || !expiresAt}
              onClick={submit}
            >
              {isPending ? "Generating..." : "Generate Payment Link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-emerald-50 p-4 text-center">
              <p className="text-sm text-emerald-700">Payment link is ready to share</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-sm font-mono break-all">{link}</div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <a href={link} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Link
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}