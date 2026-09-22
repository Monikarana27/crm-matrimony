import { getPayrollForMonth, markPayrollPaidAction } from "@/actions/hr/hr.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";

export default async function PayrollPage() {
  const now = new Date();
  const records = await getPayrollForMonth(now.getMonth() + 1, now.getFullYear());
  return (
    <div className="space-y-6">
      <DashboardHero title="Payroll" subtitle={now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} />
      <div className="space-y-2">
        {records.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
            <span>{r.user.name} — ₹{(r.baseSalary + r.incentive).toLocaleString("en-IN")}</span>
            {!r.paidAt ? (
              <form action={markPayrollPaidAction.bind(null, r.id)}>
                <button className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground">Mark Paid</button>
              </form>
            ) : (
              <span className="text-sm text-emerald-600">Paid</span>
            )}
          </div>
        ))}
        {records.length === 0 && <p className="text-sm text-muted-foreground">No payroll records this month.</p>}
      </div>
    </div>
  );
}