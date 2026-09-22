import { requireRole } from "@/lib/permissions/guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { Role } from "@/lib/permissions/roles";

export default async function ProfileSearchLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("/dashboard/profile-search");
  return <DashboardShell role={session.user.role as Role}>{children}</DashboardShell>;
}
