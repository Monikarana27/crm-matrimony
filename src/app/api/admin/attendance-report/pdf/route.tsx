import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth/auth";
import { getAttendanceReport } from "@/actions/attendance/attendance.actions";
import { AttendanceReportDocument } from "@/lib/attendance/attendance-report-document";

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "HR"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfNextMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = req.nextUrl.searchParams;
  const employeeId = searchParams.get("employeeId") || undefined;
  const role = searchParams.get("role") || undefined;
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const now = new Date();
  const rangeStart = startDateParam ? new Date(startDateParam) : startOfMonth(now);
  const rangeEndExclusive = endDateParam
    ? new Date(new Date(endDateParam).getTime() + 86400000)
    : startOfNextMonth(now);

  const rows = await getAttendanceReport({
    startDate: rangeStart,
    endDate: rangeEndExclusive,
    employeeId,
    role,
  });

  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const rangeLabel = `${fmt(rangeStart)} – ${fmt(new Date(rangeEndExclusive.getTime() - 86400000))}`;

  const buffer = await renderToBuffer(
    <AttendanceReportDocument rows={rows} rangeLabel={rangeLabel} />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attendance-report.pdf"`,
    },
  });
}
