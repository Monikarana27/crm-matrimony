"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { assignServiceEmployeeToWelcomeCallAction } from "@/actions/welcome-calls/welcome-call.actions";

type Employee = { id: string; name: string; role: string };

type WelcomeCallRow = {
  id: string;
  createdAt: Date;
  profile: {
    id: string;
    name: string;
    phone: string;
    profileCode: string | null;
    subscriptions: { plan: { name: string } }[];
  } | null;
};

function AssignSelect({ welcomeCallId, employees }: { welcomeCallId: string; employees: Employee[] }) {
  const [isPending, startTransition] = useTransition();
  const [assigned, setAssigned] = useState(false);

  function handleChange(employeeId: string) {
    startTransition(async () => {
      await assignServiceEmployeeToWelcomeCallAction(welcomeCallId, employeeId);
      setAssigned(true);
    });
  }

  if (assigned) {
    return <span className="text-xs font-medium text-emerald-600">Assigned</span>;
  }

  return (
    <Select onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-44 text-xs">
        <SelectValue placeholder={isPending ? "Assigning..." : "Assign employee"} />
      </SelectTrigger>
      <SelectContent>
        {employees.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function NewlyPaidClientsTable({
  welcomeCalls,
  employees,
}: {
  welcomeCalls: WelcomeCallRow[];
  employees: Employee[];
}) {
  const rows = welcomeCalls.filter((wc) => wc.profile !== null);

  const columns: Column<WelcomeCallRow>[] = [
    {
      key: "profile",
      header: "Client",
      render: (row) => (
        <Link
          href={`/dashboard/admin/profiles/${row.profile!.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.profile!.name}{" "}
          <span className="text-xs text-muted-foreground">({row.profile!.profileCode})</span>
        </Link>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => row.profile!.phone,
    },
    {
      key: "plan",
      header: "Plan",
      render: (row) => row.profile!.subscriptions[0]?.plan.name ?? "—",
    },
    {
      key: "createdAt",
      header: "Paid On",
      sortable: true,
      accessor: (row) => new Date(row.createdAt).getTime(),
      render: (row) => new Date(row.createdAt).toLocaleDateString("en-IN"),
    },
    {
      key: "assign",
      header: "Assign To",
      render: (row) => <AssignSelect welcomeCallId={row.id} employees={employees} />,
    },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      searchPlaceholder="Search by client name..."
      emptyMessage="No newly paid clients waiting for assignment."
    />
  );
}
