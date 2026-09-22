// src/app/(dashboard)/dashboard/service/layout.tsx
import { requireRole } from "@/lib/permissions/guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function ServiceLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("/dashboard/service");
  return <DashboardShell role={session.user.role}>{children}</DashboardShell>;
}