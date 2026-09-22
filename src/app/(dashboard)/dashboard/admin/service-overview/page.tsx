import { prisma } from "@/lib/db/prisma";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function ServiceOverviewPage() {
  const serviceStaff = await prisma.user.findMany({
    where: { role: "SERVICE", active: true },
    select: { id: true, name: true },
  });

  const stats = await Promise.all(
    serviceStaff.map(async (staff) => {
      const [assignedProfiles, meetingsToday, callsThisWeek] = await Promise.all([
        prisma.profile.count({ where: { assignedToId: staff.id, approvalStatus: "APPROVED" } }),
        prisma.meeting.count({
          where: {
            assignedToId: staff.id,
            scheduledAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        prisma.callLog.count({
          where: { createdById: staff.id, calledAt: { gte: new Date(Date.now() - 7 * 86400000) } },
        }),
      ]);
      return { staff, assignedProfiles, meetingsToday, callsThisWeek };
    })
  );

  return (
    <div className="space-y-6">
      <DashboardHero title="Service Department Overview" subtitle={`${serviceStaff.length} service agents`} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ staff, assignedProfiles, meetingsToday, callsThisWeek }) => (
          <Card key={staff.id}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link href={`/dashboard/admin/employees/${staff.id}/edit`} className="hover:underline">
                  {staff.name}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Assigned Profiles</span><span className="font-medium">{assignedProfiles}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Meetings Today</span><span className="font-medium">{meetingsToday}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Calls This Week</span><span className="font-medium">{callsThisWeek}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}