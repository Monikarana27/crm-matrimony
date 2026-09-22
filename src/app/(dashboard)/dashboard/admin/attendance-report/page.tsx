import { requireRole } from "@/lib/permissions/guard";
import { getAttendanceReport, getAttendanceFilterEmployees } from "@/actions/attendance/attendance.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { AttendanceReportTable } from "./attendance-report-table";
import { AttendanceFilters } from "./attendance-filters";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfNextMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}
function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AttendanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string; role?: string; startDate?: string; endDate?: string }>;
}) {
  await requireRole("/dashboard/admin/attendance-report");
  const { employeeId, role, startDate, endDate } = await searchParams;

  const now = new Date();
  const rangeStart = startDate ? new Date(startDate) : startOfMonth(now);
  const rangeEndExclusive = endDate ? new Date(new Date(endDate).getTime() + 86400000) : startOfNextMonth(now);

  const [rows, employees] = await Promise.all([
    getAttendanceReport({ startDate: rangeStart, endDate: rangeEndExclusive, employeeId, role }),
    getAttendanceFilterEmployees(),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Work Hours Report"
        subtitle="Daily check-in, break, and check-out records"
      />
      <AttendanceFilters
        employees={employees}
        defaultStartDate={toDateInput(rangeStart)}
        defaultEndDate={toDateInput(new Date(rangeEndExclusive.getTime() - 86400000))}
        defaultEmployeeId={employeeId ?? ""}
        defaultRole={role ?? ""}
      />
      <AttendanceReportTable rows={rows} />
    </div>
  );
}
