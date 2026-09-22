import { DashboardHero } from "@/components/layout/dashboard-hero";
import { EmployeeForm } from "../employee-form";
import { createEmployeeAction, getEligibleManagerCandidates } from "@/actions/employees/employee.actions";

export default async function NewEmployeePage() {
  const managerCandidates = await getEligibleManagerCandidates();

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Add Employee"
        subtitle="Create a new team member account."
      />
      <EmployeeForm mode="create" action={createEmployeeAction} managerCandidates={managerCandidates} />
    </div>
  );
}