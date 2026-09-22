"use client";

import { useState, useTransition } from "react";
import { Heart, ShieldCheck, Sparkles } from "lucide-react";
import { initiateCheckoutAction } from "@/actions/payment-offers/payment-offer.actions";

type Offer = {
  id: string;
  token: string;
  status: string;
  originalAmount: number;
  finalAmount: number;
  currency: string;
  expiresAt: Date;
  plan: { name: string };
  profile: { name: string };
};

function formatMoney(amount: number, currency: string) {
  const symbol = currency === "USD" ? "$" : "₹";
  return `${symbol}${amount.toLocaleString(currency === "USD" ? "en-US" : "en-IN")}`;
}

export function CheckoutCard({ offer }: { offer: Offer }) {
  const [isPending, startTransition] = useTransition();
  const [payError, setPayError] = useState<string | null>(null);

  const isExpired = new Date(offer.expiresAt) < new Date() || offer.status === "EXPIRED";
  const isPaid = offer.status === "PAID";
  const isCancelled = offer.status === "CANCELLED";

  const savings = offer.originalAmount - offer.finalAmount;

  function handlePay() {
    setPayError(null);
    startTransition(async () => {
      const res = await initiateCheckoutAction(offer.token);
      if (res.error) {
        setPayError(res.error);
        return;
      }
      window.location.href = res.checkoutUrl!;
    });
  }

  if (isPaid) {
    return (
      <StatusCard
        icon={<Heart className="h-10 w-10 text-rose-500" fill="currentColor" />}
        title="This payment offer has already been completed."
      />
    );
  }
  if (isCancelled) {
    return <StatusCard title="This payment link is no longer available." />;
  }
  if (isExpired) {
    return (
      <StatusCard
        title="This special offer has expired."
        subtitle="Please contact us to receive a new offer."
      />
    );
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl">
      <div className="bg-white px-6 py-8 text-center border-b">
        <p className="mb-1 text-2xl font-bold text-blue-600">EliteBandhan</p>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Special Offer
        </p>
        <h1 className="font-serif text-xl font-bold text-gray-800">{offer.plan.name} Membership</h1>
      </div>

      <div className="space-y-6 px-6 py-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground line-through">
            {formatMoney(offer.originalAmount, offer.currency)}
          </p>
          <p className="text-4xl font-bold text-blue-600">
            {formatMoney(offer.finalAmount, offer.currency)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Sparkles className="h-3 w-3" />
            You save {formatMoney(savings, offer.currency)}
          </p>
        </div>

        <ul className="space-y-2 text-sm text-gray-700">
          {[
            "Premium profile visibility",
            "Contact access to matched profiles",
            "Full membership benefits",
            "Dedicated Relationship Manager support",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-600">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <p className="text-center text-xs text-muted-foreground">
          Offer expires: {new Date(offer.expiresAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>

        {payError && <p className="text-center text-sm text-destructive">{payError}</p>}

        <button
          onClick={handlePay}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-base font-semibold text-white shadow-md transition-transform hover:scale-[1.01] hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Redirecting..." : `Pay ${formatMoney(offer.finalAmount, offer.currency)}`}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Secure payment
        </p>
      </div>
    </div>
  );
}

function StatusCard({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-lg">
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <p className="text-lg font-semibold text-gray-800">{title}</p>
      {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}