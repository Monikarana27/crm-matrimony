import { requireRole } from "@/lib/permissions/guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { Role } from "@/lib/permissions/roles";

export default async function DiscountsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("/dashboard/discounts");
  return <DashboardShell role={session.user.role as Role}>{children}</DashboardShell>;
}