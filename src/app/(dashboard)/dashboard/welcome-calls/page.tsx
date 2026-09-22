import { auth } from "@/lib/auth/auth";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { getWelcomeCalls } from "@/actions/welcome-calls/welcome-call.actions";
import { WelcomeCallsTable } from "@/components/shared/welcome-calls-table";
import { AdminWelcomeCallsTable } from "@/components/shared/admin-welcome-calls-table";
import { ServiceWelcomeCallsTable } from "@/components/shared/service-welcome-calls-table";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
const TEAM_ROLES = ["SALES_TL", "SALES_MANAGER", "SERVICE_TL", "SERVICE_MANAGER"];
const SERVICE_ROLES = ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"];

export default async function WelcomeCallsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; department?: string }>;
}) {
  const session = await auth();
  const { status, department } = await searchParams;

  const rows = await getWelcomeCalls({
    status: status as "PENDING" | "COMPLETED" | undefined,
    department: department as "SALES" | "SERVICE" | undefined,
  });

  const role = session!.user.role;
  const isAdmin = ADMIN_ROLES.includes(role);
  const isTeamRole = TEAM_ROLES.includes(role);
  const isServiceRole = SERVICE_ROLES.includes(role);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Welcome Calls"
        subtitle={
          isAdmin
            ? "Org-wide assignment tracking for Sales and Service."
            : isTeamRole
            ? "Your and your team's assigned leads/profiles."
            : "Your assigned leads and profiles."
        }
      />

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <a href="/dashboard/welcome-calls" className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted">All</a>
          <a href="/dashboard/welcome-calls?department=SALES" className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted">Sales</a>
          <a href="/dashboard/welcome-calls?department=SERVICE" className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted">Service</a>
          <a href="/dashboard/welcome-calls?status=PENDING" className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted">Pending Only</a>
          <a href="/dashboard/welcome-calls?status=COMPLETED" className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted">Completed Only</a>
        </div>
      )}

      {isAdmin ? (
        <AdminWelcomeCallsTable rows={rows} />
      ) : isServiceRole ? (
        <ServiceWelcomeCallsTable rows={rows} />
      ) : (
        <WelcomeCallsTable rows={rows} showAssignee={isTeamRole} />
      )}
    </div>
  );
}
