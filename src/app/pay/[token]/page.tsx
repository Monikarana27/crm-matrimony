import { notFound } from "next/navigation";
import { getPaymentOfferByToken, trackOfferOpenedAction } from "@/actions/payment-offers/payment-offer.actions";
import { CheckoutCard } from "./checkout-card";

export default async function PublicCheckoutPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const offer = await getPaymentOfferByToken(token);

  if (!offer) {
    notFound();
  }

  await trackOfferOpenedAction(token);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <CheckoutCard offer={offer} />
    </div>
  );
}