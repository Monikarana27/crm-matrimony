"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

type EmployeeAccessRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  rolePermissionCount: number;
  extraPermissionCount: number;
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

const badgeBase = "text-[11px] font-medium px-1.5 py-0 h-5 leading-5";

export function EmployeeAccessTable({ employees }: { employees: EmployeeAccessRow[] }) {
  const columns: Column<EmployeeAccessRow>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium">{row.name}</span>
          <span className="text-xs text-muted-foreground">{row.email}</span>
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
      key: "rolePermissionCount",
      header: "From Role",
      accessor: (row) => row.rolePermissionCount,
      render: (row) => (
        <span className="text-xs text-muted-foreground">{row.rolePermissionCount}</span>
      ),
    },
    {
      key: "extraPermissionCount",
      header: "Extra Access",
      accessor: (row) => row.extraPermissionCount,
      render: (row) => (
        <Badge
          variant="outline"
          className={`${badgeBase} ${
            row.extraPermissionCount > 0
              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : "bg-gray-100 text-gray-500 border-gray-200"
          }`}
        >
          +{row.extraPermissionCount}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/admin/employee-access/${row.id}`}>
              <ShieldCheck className="mr-2 h-3.5 w-3.5" />
              Manage Access
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={employees}
      columns={columns}
      searchPlaceholder="Search employees..."
      emptyMessage="No employees yet."
    />
  );
}