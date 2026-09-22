import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Complete Your Payment",
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-amber-50">{children}</div>;
}