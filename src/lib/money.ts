/** Formats an amount with the symbol of its own currency: ₹1,500 or $450. */
export function formatMoney(amount: number, currency?: string | null): string {
  const isUsd = currency === "USD";
  return `${isUsd ? "$" : "₹"}${amount.toLocaleString(isUsd ? "en-US" : "en-IN")}`;
}
