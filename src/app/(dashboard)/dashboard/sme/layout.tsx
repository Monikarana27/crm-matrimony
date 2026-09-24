import { auth } from "@/lib/auth/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { Role } from "@/lib/permissions/roles";

export default async function SmeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return <DashboardShell role={session!.user.role as Role}>{children}</DashboardShell>;
}
