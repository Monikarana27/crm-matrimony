"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CreateOfferDialog } from "@/components/shared/create-offer-dialog";

type Client = {
  id: string;
  name: string;
  profileCode: string;
  assignedTo: { id: string; name: string } | null;
  subscriptions: { plan: { id: string; name: string; price: number } }[];
  paymentOffers: { status: string; finalAmount: number; createdAt: Date }[];
};

const OFFER_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700 border-blue-200",
  OPENED: "bg-indigo-100 text-indigo-700 border-indigo-200",
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  EXPIRED: "bg-gray-100 text-gray-700 border-gray-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

export function DiscountsTable({ clients, showAssignee }: { clients: Client[]; showAssignee: boolean }) {
  const allPlans = Array.from(
    new Map(
      clients.flatMap((c) => c.subscriptions.map((s) => [s.plan.id, s.plan]))
    ).values()
  );

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
            <th className="p-3 font-medium">Client</th>
            <th className="p-3 font-medium">Current Plan</th>
            {showAssignee && <th className="p-3 font-medium">Assigned To</th>}
            <th className="p-3 font-medium">Last Offer</th>
            <th className="p-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const currentPlan = client.subscriptions[0]?.plan;
            const lastOffer = client.paymentOffers[0];
            const clientPlans = currentPlan ? [currentPlan] : allPlans;

            return (
              <tr key={client.id} className="border-b last:border-0">
                <td className="p-3">
                  <Link href={`/dashboard/admin/profiles/${client.id}`} className="font-medium text-primary hover:underline">
                    {client.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{client.profileCode}</p>
                </td>
                <td className="p-3">{currentPlan?.name ?? "—"}</td>
                {showAssignee && (
                  <td className="p-3 text-muted-foreground">{client.assignedTo?.name ?? "—"}</td>
                )}
                <td className="p-3">
                  {lastOffer ? (
                    <Badge variant="outline" className={OFFER_STATUS_STYLES[lastOffer.status] ?? ""}>
                      {lastOffer.status} — ₹{lastOffer.finalAmount.toLocaleString("en-IN")}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">No offers yet</span>
                  )}
                </td>
                <td className="p-3">
                  <CreateOfferDialog profileId={client.id} plans={clientPlans} />
                </td>
              </tr>
            );
          })}
          {clients.length === 0 && (
            <tr>
              <td colSpan={showAssignee ? 5 : 4} className="p-8 text-center text-muted-foreground">
                No active paying clients found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}