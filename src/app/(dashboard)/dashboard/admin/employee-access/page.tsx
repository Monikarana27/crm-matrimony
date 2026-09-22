import { getEmployeeAccessSummary } from "@/actions/employees/employee-permission.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { EmployeeAccessTable } from "./employee-access-table";

export default async function EmployeeAccessPage() {
  const employees = await getEmployeeAccessSummary();

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Employee Access"
        subtitle="Give any employee additional access to specific pages, on top of what their role already includes."
      />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">All Employees</h2>
      </div>

      <EmployeeAccessTable employees={employees} />
    </div>
  );
}