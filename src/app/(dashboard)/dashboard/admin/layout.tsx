import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const shellRole = session.user.role === "SUPER_ADMIN" ? "ADMIN" : session.user.role;
  return <DashboardShell role={shellRole as any}>{children}</DashboardShell>;
}