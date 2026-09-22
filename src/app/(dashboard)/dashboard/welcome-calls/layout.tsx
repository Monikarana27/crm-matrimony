import { requireRole } from "@/lib/permissions/guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { Role } from "@/lib/permissions/roles";

export default async function WelcomeCallsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("/dashboard/welcome-calls");
  return <DashboardShell role={session.user.role as Role}>{children}</DashboardShell>;
}