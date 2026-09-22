import { prisma } from "@/lib/db/prisma";
import { getAttendanceForDate, checkInAction } from "@/actions/hr/hr.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";

export default async function AttendancePage() {
  const today = new Date();
  const records = await getAttendanceForDate(today);
  const employees = await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } });

  return (
    <div className="space-y-6">
      <DashboardHero title="Attendance" subtitle={today.toLocaleDateString("en-IN")} />
      <div className="space-y-2">
        {employees.map((emp) => {
          const record = records.find((r) => r.userId === emp.id);
          return (
            <form key={emp.id} action={checkInAction.bind(null, emp.id)} className="flex items-center justify-between rounded-lg border p-3">
              <span>{emp.name}</span>
              <span className="text-sm text-muted-foreground">
                {record ? `Checked in: ${new Date(record.checkIn!).toLocaleTimeString()}` : "Not checked in"}
              </span>
              <button type="submit" className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground">Check In</button>
            </form>
          );
        })}
      </div>
    </div>
  );
}