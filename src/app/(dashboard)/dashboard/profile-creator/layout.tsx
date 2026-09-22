import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function ProfileCreatorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN", "PROFILE_CREATOR", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"].includes(session.user.role)) {
    redirect("/login");
  }
  return <DashboardShell role={session.user.role} children={children} />;
}