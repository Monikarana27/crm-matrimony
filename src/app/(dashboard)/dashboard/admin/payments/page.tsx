import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getPayments } from "@/actions/payments/payment.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PaymentsTable } from "./payments-table";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const validStatus = ["PAID", "PENDING", "FAILED"].includes(status ?? "")
    ? (status as "PAID" | "PENDING" | "FAILED")
    : undefined;

  const payments = await getPayments(validStatus ? { status: validStatus } : undefined);
  const session = await auth();
  const canDelete = !!session?.user && ["SUPER_ADMIN", "ADMIN"].includes(session.user.role);

  const tabs = [
    { label: "All Payments", value: undefined },
    { label: "Paid", value: "PAID" },
    { label: "Pending", value: "PENDING" },
    { label: "Failed", value: "FAILED" },
  ];

  const totalPaid = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Payments"
        subtitle={`Total collected: ₹${totalPaid.toLocaleString("en-IN")}`}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = validStatus === tab.value;
            const href = tab.value
              ? `/dashboard/admin/payments?status=${tab.value}`
              : "/dashboard/admin/payments";
            return (
              <Link
                key={tab.label}
                href={href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/payments/new">
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Link>
        </Button>
      </div>

      <PaymentsTable payments={payments} canDelete={canDelete} />
    </div>
  );
}
