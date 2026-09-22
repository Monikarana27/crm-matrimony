"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Employee = { id: string; name: string };

type ProfileRow = {
  id: string;
  name: string;
  profileCode: string;
  assignedAt: Date | null;
  assignedTo: { id: string; name: string } | null;
  subscriptions: {
    status: string;
    payments: { status: string }[];
  }[];
};

type LeadRow = {
  id: string;
  name: string;
  phone: string;
  status: string;
  updatedAt: Date;
  assignedTo: { id: string; name: string } | null;
};

const SERVICE_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  HOLD: "bg-orange-100 text-orange-700 border-orange-200",
  EXPIRED: "bg-red-100 text-red-700 border-red-200",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
};

const LEAD_STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 border-blue-200",
  CONTACTED: "bg-amber-100 text-amber-700 border-amber-200",
  CONVERTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDING: "bg-orange-100 text-orange-700 border-orange-200",
  CLOSED: "bg-gray-100 text-gray-700 border-gray-200",
};

interface AssignmentsFilterProps {
  employees: Employee[];
  profiles: ProfileRow[];
  leads: LeadRow[];
  currentEmployeeId?: string;
  currentType?: string;
}

export function AssignmentsFilter({
  employees,
  profiles,
  leads,
  currentEmployeeId,
  currentType,
}: AssignmentsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeType = currentType === "leads" ? "leads" : "profiles";

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`/dashboard/admin/assignments?${params.toString()}`);
  }

  const profileColumns: Column<ProfileRow>[] = [
    {
      key: "name",
      header: "Profile",
      render: (row) => (
        <span className="font-medium">
          {row.name}{" "}
          <span className="text-xs text-muted-foreground">({row.profileCode})</span>
        </span>
      ),
    },
    {
      key: "assignedTo",
      header: "Assigned To",
      render: (row) => row.assignedTo?.name ?? "—",
    },
    {
      key: "assignedAt",
      header: "Assignment Date",
      sortable: true,
      accessor: (row) => (row.assignedAt ? new Date(row.assignedAt).getTime() : 0),
      render: (row) =>
        row.assignedAt ? new Date(row.assignedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—",
    },
    {
      key: "paymentStatus",
      header: "Payment Status",
      render: (row) => {
        const status = row.subscriptions[0]?.payments[0]?.status;
        return status ? (
          <Badge variant="outline" className={PAYMENT_STATUS_STYLES[status] ?? ""}>
            {status}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "serviceStatus",
      header: "Service Status",
      render: (row) => {
        const status = row.subscriptions[0]?.status;
        return status ? (
          <Badge variant="outline" className={SERVICE_STATUS_STYLES[status] ?? ""}>
            {status}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
  ];

  const leadColumns: Column<LeadRow>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "phone", header: "Phone" },
    {
      key: "assignedTo",
      header: "Assigned To",
      render: (row) => row.assignedTo?.name ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant="outline" className={LEAD_STATUS_STYLES[row.status] ?? ""}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      sortable: true,
      accessor: (row) => new Date(row.updatedAt).getTime(),
      render: (row) => new Date(row.updatedAt).toLocaleDateString("en-IN"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant={activeType === "profiles" ? "default" : "outline"}
            size="sm"
            onClick={() => updateParams({ type: "profiles" })}
          >
            Assigned Profiles
          </Button>
          <Button
            variant={activeType === "leads" ? "default" : "outline"}
            size="sm"
            onClick={() => updateParams({ type: "leads" })}
          >
            Assigned Leads
          </Button>
        </div>

        <div className="w-56">
          <Select
            value={currentEmployeeId ?? "all"}
            onValueChange={(value) =>
              updateParams({ employeeId: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeType === "profiles" ? (
        <DataTable
          data={profiles}
          columns={profileColumns}
          searchPlaceholder="Search assigned profiles..."
          emptyMessage="No assigned profiles found."
        />
      ) : (
        <DataTable
          data={leads}
          columns={leadColumns}
          searchPlaceholder="Search assigned leads..."
          emptyMessage="No assigned leads found."
        />
      )}
    </div>
  );
}
