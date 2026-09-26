"use server";

import { auth } from "@/lib/auth/auth";
import { getPaymentHistory } from "@/lib/stats/payment-history";

export async function getPaymentHistoryAction(profileId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return getPaymentHistory(profileId);
}
