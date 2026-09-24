"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { EmployeeRowActions } from "./employee-row-actions";
import { ViewAsButton } from "@/components/shared/view-as-button";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import type { Role } from "@/lib/permissions/roles";

type EmployeeRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  role: string;
  active: boolean;
  createdAt: Date;
  manager?: { id: string; name: string } | null;
  _count: {
    assignedLeads: number;
    assignedProfiles: number;
  };
};

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-violet-100 text-violet-700 border-violet-200",
  ADMIN: "bg-violet-100 text-violet-700 border-violet-200",
  SALES: "bg-blue-100 text-blue-700 border-blue-200",
  SALES_TL: "bg-cyan-100 text-cyan-700 border-cyan-200",
  SALES_MANAGER: "bg-indigo-100 text-indigo-700 border-indigo-200",
  PROFILE_CREATOR: "bg-amber-100 text-amber-700 border-amber-200",
  SERVICE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  SERVICE_TL: "bg-teal-100 text-teal-700 border-teal-200",
  SERVICE_MANAGER: "bg-green-100 text-green-700 border-green-200",
  HR: "bg-rose-100 text-rose-700 border-rose-200",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SALES: "Sales",
  SALES_TL: "Sales TL",
  SALES_MANAGER: "Sales Mgr",
  PROFILE_CREATOR: "Profile Creator",
  SERVICE: "Service",
  SERVICE_TL: "Service TL",
  SERVICE_MANAGER: "Sales & Service Mgr",
  HR: "HR",
};

const DEPARTMENT_LABELS: Record<string, string> = {
  SALES_EMP: "Sales",
  PROFILE_EMP: "Profile",
  SERVICE_EMP: "Service",
  HR_EMP: "HR",
};

const badgeBase = "text-[11px] font-medium px-1.5 py-0 h-5 leading-5";

export function EmployeesTable({ employees }: { employees: EmployeeRow[] }) {
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    if (departmentFilter === "ALL") return employees;
    return employees.filter((e) => e.department === departmentFilter);
  }, [employees, departmentFilter]);

  const columns: Column<EmployeeRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <EmployeeAvatar name={row.name} role={row.role as Role} className="h-8 w-8" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium">{row.name}</span>
            <span className="text-xs text-muted-foreground">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <Badge
          variant="outline"
          className={`${badgeBase} ${ROLE_STYLES[row.role] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}
        >
          {ROLE_LABELS[row.role] ?? row.role}
        </Badge>
      ),
    },
    {
      key: "department",
      header: "Dept",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.department ? DEPARTMENT_LABELS[row.department] ?? row.department : "—"}
        </span>
      ),
    },
    {
      key: "manager",
      header: "Reports To",
      render: (row) => (
        <span className="text-xs text-muted-foreground">{row.manager?.name ?? "—"}</span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => <span className="text-xs text-muted-foreground">{row.phone || "—"}</span>,
    },
    {
      key: "createdAt",
      header: "Joined",
      sortable: true,
      accessor: (row) => new Date(row.createdAt).getTime(),
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
        </span>
      ),
    },
    {
      key: "active",
      header: "Status",
      render: (row) => (
        <Badge
          variant="outline"
          className={`${badgeBase} ${
            row.active
              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : "bg-red-100 text-red-700 border-red-200"
          }`}
        >
          {row.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "workload",
      header: "Workload",
      accessor: (row) => row._count.assignedLeads + row._count.assignedProfiles,
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {row._count.assignedLeads}L · {row._count.assignedProfiles}P
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <ViewAsButton userId={row.id} />
          <EmployeeRowActions employee={row} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Department:</span>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            <SelectItem value="SALES_EMP">Sales</SelectItem>
            <SelectItem value="PROFILE_EMP">Profile</SelectItem>
            <SelectItem value="SERVICE_EMP">Service</SelectItem>
            <SelectItem value="HR_EMP">HR</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search employees..."
        emptyMessage="No employees yet. Add your first team member."
      />
    </div>
  );
}