import Link from "next/link";
import { getEmployees } from "@/actions/employees/employee.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { EmployeesTable } from "./employees-table";

export default async function EmployeesPage() {
  const employees = await getEmployees();

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Employees"
        subtitle="Manage your Sales, Service, and Admin team members."
      />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">All Employees</h2>
        <Button asChild>
          <Link href="/dashboard/admin/employees/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Link>
        </Button>
      </div>

      <EmployeesTable employees={employees} />
    </div>
  );
}