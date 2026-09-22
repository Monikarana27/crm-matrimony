import { requireRole } from "@/lib/permissions/guard";
import { prisma } from "@/lib/db/prisma";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { LoginHistoryTable } from "./login-history-table";

export default async function LoginHistoryPage() {
  await requireRole("/dashboard/admin/login-history");

  const events = await prisma.loginEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { user: { select: { name: true, role: true } } },
  });

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Login History"
        subtitle={`${events.length} recent logins · records are kept for 40 days`}
      />
      <LoginHistoryTable events={events} />
    </div>
  );
}
