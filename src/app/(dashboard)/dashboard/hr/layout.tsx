import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function HRLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "HR"].includes(session.user.role)) redirect("/login");
  return <DashboardShell role="HR" children={children} />;
}