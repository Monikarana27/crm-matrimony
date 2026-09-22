import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { Role } from "@/lib/permissions/roles";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (!session.user.active) redirect("/login?error=inactive");

  return <DashboardShell role={session.user.role as Role}>{children}</DashboardShell>;
}