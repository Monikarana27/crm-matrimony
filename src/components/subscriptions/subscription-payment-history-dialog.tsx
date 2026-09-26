"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getPaymentHistoryAction } from "@/actions/subscriptions/payment-history.actions";
import type { PaymentHistoryEntry } from "@/lib/stats/payment-history";

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
  REFUNDED: "bg-slate-100 text-slate-700 border-slate-200",
};

function formatMoney(amount: number, currency: string) {
  const symbol = currency === "USD" ? "$" : "\u20b9";
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

export function SubscriptionPaymentHistoryDialog({
  profileId,
  profileName,
  open,
  onOpenChange,
}: {
  profileId: string;
  profileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [entries, setEntries] = useState<PaymentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    getPaymentHistoryAction(profileId)
      .then((data) => setEntries(data))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load payment history."))
      .finally(() => setLoading(false));
  }, [open, profileId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Payment History — {profileName}</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Plan</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Method</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Sold By</th>
                  <th className="pb-2 pr-4">Service Window</th>
                  <th className="pb-2">Sub. Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.paymentId} className="border-b last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(e.paidAt ?? e.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-2 pr-4">{e.planName}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatMoney(e.amount, e.currency)}</td>
                    <td className="py-2 pr-4">{e.method.replace("_", " ")}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className={STATUS_STYLES[e.status] ?? ""}>
                        {e.status}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">{e.soldByName ?? "—"}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(e.startDate).toLocaleDateString("en-IN")} –{" "}
                      {e.endDate ? new Date(e.endDate).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-2">
                      <Badge variant="outline">{e.subscriptionStatus}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
