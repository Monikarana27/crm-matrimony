import { auth } from "@/lib/auth/auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { getEmployeeExtraModules } from "@/actions/employees/employee-permission.actions";
import { getMyTodayAttendance } from "@/actions/attendance/attendance.actions";
import { OnBreakScreen } from "@/components/layout/on-break-screen";
import { ScrollHelpers } from "@/components/layout/scroll-helpers";
import { BackButton } from "@/components/layout/back-button";
import type { Role } from "@/lib/permissions/roles";

export async function DashboardShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const session = await auth();
  const extraModules = session?.user?.id
    ? await getEmployeeExtraModules(session.user.id)
    : [];

  const attendance = await getMyTodayAttendance();
  const isExempt = role === "ADMIN" || role === "SUPER_ADMIN" || !!session?.user?.impersonating;
  const isOnBreak = !!attendance?.breakStart && !attendance?.breakEnd;

  if (isOnBreak && !isExempt) {
    return <OnBreakScreen breakStart={attendance!.breakStart!} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {session?.user?.impersonating && session.user.originalUserName && (
        <ImpersonationBanner originalUserName={session.user.originalUserName} />
      )}
      <div className="flex flex-1">
        <Sidebar role={role} extraModules={extraModules} userName={session?.user?.name ?? undefined} />
        <div className="flex flex-1 flex-col min-w-0">
          <Header role={role} />
          <main className="flex-1 bg-muted/30 p-6">
            <BackButton />
            {children}
          </main>
          <ScrollHelpers />
        </div>
      </div>
    </div>
  );
}
