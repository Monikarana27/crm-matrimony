import { auth } from "@/lib/auth/auth";
import { getSalesTargetsForMonth } from "@/actions/sales-targets/sales-target.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { SalesTargetsGrid } from "@/components/shared/sales-targets-grid";

export default async function SalesTargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await auth();
  const { month, year } = await searchParams;
  const now = new Date();
  const selectedMonth = month ? parseInt(month) : now.getMonth() + 1;
  const selectedYear = year ? parseInt(year) : now.getFullYear();

  const targets = await getSalesTargetsForMonth(selectedMonth, selectedYear);

  const monthLabel = new Date(selectedYear, selectedMonth - 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Sales Targets"
        subtitle={`Monthly performance targets — ${monthLabel}`}
      />
      <SalesTargetsGrid
        targets={targets}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        isImpersonating={!!session?.user?.impersonating}
      />
    </div>
  );
}