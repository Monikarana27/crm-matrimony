import { getPaymentOfferByToken } from "@/actions/payment-offers/payment-offer.actions";
import { CheckCircle2 } from "lucide-react";

export default async function PaymentSuccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const offer = await getPaymentOfferByToken(token);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-lg">
        <div className="mb-4 flex justify-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        </div>
        <h1 className="mb-1 text-xl font-bold text-gray-800">Payment Successful</h1>
        <p className="mb-6 text-sm text-muted-foreground">Thank you for your payment.</p>

        {offer && offer.status === "PAID" ? (
          <div className="space-y-1 rounded-lg border bg-muted/30 p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Membership</span>
              <span className="font-medium">{offer.plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium">
                {offer.currency === "USD" ? "$" : "₹"}{offer.finalAmount.toLocaleString(offer.currency === "USD" ? "en-US" : "en-IN")}
              </span>
            </div>
            {offer.paymentTransactionId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono text-xs">{offer.paymentTransactionId}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            We're finalizing your payment confirmation — this may take a moment.
          </p>
        )}

        <p className="mt-6 text-xs text-muted-foreground">Your membership has been activated.</p>
      </div>
    </div>
  );
}