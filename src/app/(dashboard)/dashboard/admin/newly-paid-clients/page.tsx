import { getNewlyPaidClients } from "@/actions/welcome-calls/welcome-call.actions";
import { getAssignableEmployees } from "@/actions/employees/employee.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { NewlyPaidClientsTable } from "./newly-paid-clients-table";

export default async function NewlyPaidClientsPage() {
  const welcomeCalls = await getNewlyPaidClients();
  const allEmployees = await getAssignableEmployees();
  const serviceEmployees = allEmployees.filter((e) =>
    ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"].includes(e.role)
  );

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Newly Paid Clients"
        subtitle="Assign a Service employee to start the welcome call."
      />
      <NewlyPaidClientsTable welcomeCalls={welcomeCalls} employees={serviceEmployees} />
    </div>
  );
}
