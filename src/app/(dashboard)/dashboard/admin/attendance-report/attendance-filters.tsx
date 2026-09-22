"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/permissions/roles";
import { Download } from "lucide-react";

type Employee = { id: string; name: string; role: string };

export function AttendanceFilters({
  employees,
  defaultStartDate,
  defaultEndDate,
  defaultEmployeeId,
  defaultRole,
}: {
  employees: Employee[];
  defaultStartDate: string;
  defaultEndDate: string;
  defaultEmployeeId: string;
  defaultRole: string;
}) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId);
  const [role, setRole] = useState(defaultRole);

  function buildParams() {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (employeeId) params.set("employeeId", employeeId);
    if (role) params.set("role", role);
    return params;
  }

  function applyFilters() {
    router.push(`?${buildParams().toString()}`);
  }

  function exportPdf() {
    window.open(`/api/admin/attendance-report/pdf?${buildParams().toString()}`, "_blank");
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">From</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-9 rounded-md border border-slate-200 px-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">To</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-9 rounded-md border border-slate-200 px-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Employee</label>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="h-9 rounded-md border border-slate-200 px-2 text-sm min-w-[160px]"
        >
          <option value="">All employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-9 rounded-md border border-slate-200 px-2 text-sm min-w-[140px]"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <Button size="sm" onClick={applyFilters}>
        Apply
      </Button>
      <Button size="sm" variant="outline" onClick={exportPdf} className="gap-1.5">
        <Download className="h-3.5 w-3.5" />
        Export PDF
      </Button>
    </div>
  );
}
