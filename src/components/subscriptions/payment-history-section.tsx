"use client";

import { useState } from "react";
import { Section } from "@/components/shared/profile-detail-sections";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { SubscriptionRenewDialog } from "@/components/subscriptions/subscription-renew-dialog";
import type { PaymentHistoryEntry } from "@/lib/stats/payment-history";

const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
  REFUNDED: "bg-slate-100 text-slate-700 border-slate-200",
};

function formatMoney(amount: number, currency: string) {
  const symbol = currency === "USD" ? "$" : "₹";
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

export function PaymentHistorySection({
  profileId,
  profileName,
  entries,
  isAdmin = false,
}: {
  profileId: string;
  profileName: string;
  entries: PaymentHistoryEntry[];
  isAdmin?: boolean;
}) {
  const [renewOpen, setRenewOpen] = useState(false);

  return (
    <Section
      title="PAYMENT HISTORY"
      action={
        isAdmin ? (
          <Button size="sm" onClick={() => setRenewOpen(true)}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Renew / Extend Service
          </Button>
        ) : undefined
      }
    >
      <div className="col-span-full overflow-x-auto">
        {entries.length === 0 ? (
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
                    {(e.paidAt ?? e.createdAt).toLocaleDateString("en-IN")}
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

      {isAdmin && (
        <SubscriptionRenewDialog
          profileId={profileId}
          profileName={profileName}
          open={renewOpen}
          onOpenChange={setRenewOpen}
        />
      )}
    </Section>
  );
}
