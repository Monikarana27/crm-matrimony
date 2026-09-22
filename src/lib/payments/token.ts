import crypto from "crypto";

// Generates a short, URL-safe, unpredictable token — e.g. "8KJ4X92M" style.
// Not sequential, not based on any database ID, safe to expose in a public URL.
export function generatePaymentToken(): string {
  const bytes = crypto.randomBytes(6);
  return bytes.toString("base64url").toUpperCase().slice(0, 10);
}