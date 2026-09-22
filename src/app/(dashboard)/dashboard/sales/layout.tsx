// src/app/(dashboard)/dashboard/sales/layout.tsx
import { requireRole } from "@/lib/permissions/guard";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("/dashboard/sales");
  return <DashboardShell role={session.user.role}>{children}</DashboardShell>;
}