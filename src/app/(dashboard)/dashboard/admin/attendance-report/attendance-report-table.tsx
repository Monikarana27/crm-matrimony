"use client";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";

type AttendanceRow = {
  id: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  breakStart: Date | null;
  breakEnd: Date | null;
  user: { id: string; name: string; role: string };
};

const MANDATORY_HOURS = 8.5;

function fmtTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function breakMinutes(row: AttendanceRow): number | null {
  if (!row.breakStart || !row.breakEnd) return null;
  return Math.round((new Date(row.breakEnd).getTime() - new Date(row.breakStart).getTime()) / 60000);
}

function totalHoursDecimal(row: AttendanceRow): number | null {
  if (!row.checkIn || !row.checkOut) return null;
  return (new Date(row.checkOut).getTime() - new Date(row.checkIn).getTime()) / 3600000;
}

function totalHoursLabel(row: AttendanceRow): string {
  const total = totalHoursDecimal(row);
  if (total === null) return "—";
  return `${total.toFixed(1)}h`;
}

function shortfallMinutes(row: AttendanceRow): number | null {
  const total = totalHoursDecimal(row);
  if (total === null) return null;
  const diff = (MANDATORY_HOURS - total) * 60;
  return diff > 0 ? Math.round(diff) : null;
}

export function AttendanceReportTable({ rows }: { rows: AttendanceRow[] }) {
  const columns: Column<AttendanceRow>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      accessor: (row) => new Date(row.date).getTime(),
      render: (row) => (
        <span className="font-medium text-slate-700">
          {new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "employee",
      header: "Employee",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.user.name}</span>
          <span className="text-[11px] text-muted-foreground">{row.user.role.replace(/_/g, " ")}</span>
        </div>
      ),
    },
    { key: "checkIn", header: "Check In", render: (row) => fmtTime(row.checkIn) },
    {
      key: "break",
      header: "Break",
      render: (row) => {
        const mins = breakMinutes(row);
        if (mins === null) return "—";
        return `${fmtTime(row.breakStart)}–${fmtTime(row.breakEnd)} (${mins}m)`;
      },
    },
    { key: "checkOut", header: "Check Out", render: (row) => fmtTime(row.checkOut) },
    {
      key: "totalHours",
      header: "Total Hours",
      render: (row) => {
        const shortfall = shortfallMinutes(row);
        return (
          <div className="flex items-center gap-1.5">
            <span>{totalHoursLabel(row)}</span>
            {shortfall !== null && (
              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0">
                -{shortfall}m
              </Badge>
            )}
          </div>
        );
      },
    },
  ];
  return (
    <div className="text-sm [&_table]:text-xs [&_th]:py-2 [&_td]:py-2">
      <DataTable
        data={rows}
        columns={columns}
        searchPlaceholder="Search employee..."
        emptyMessage="No attendance records for this range."
      />
    </div>
  );
}
