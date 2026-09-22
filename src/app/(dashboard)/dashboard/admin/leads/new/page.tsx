import { DashboardHero } from "@/components/layout/dashboard-hero";
import { LeadForm } from "../lead-form";
import { createLeadAction } from "@/actions/leads/lead.actions";
import { getAssignableEmployees } from "@/actions/employees/employee.actions";

export default async function NewLeadPage() {
  const employees = await getAssignableEmployees();

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Add Lead"
        subtitle="Log a new inbound inquiry."
      />
      <LeadForm mode="create" action={createLeadAction} employees={employees} />
    </div>
  );
}