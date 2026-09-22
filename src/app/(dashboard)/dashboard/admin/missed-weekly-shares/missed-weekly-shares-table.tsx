"use client";
import Link from "next/link";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ClientRow = {
  subscriptionId: string;
  profileId: string;
  name: string;
  profileCode: string | null;
  phone: string;
  subscriptionStart: Date;
  lastSharedAt: Date | null;
  daysSinceLastShare: number;
  assignedToName: string | null;
};

export function MissedWeeklySharesTable({ clients }: { clients: readonly ClientRow[] }) {
  const data = clients.map((c) => ({ ...c, id: c.subscriptionId }));
  const columns: Column<ClientRow>[] = [
    {
      key: "profileCode",
      header: "Profile ID",
      render: (row) =>
        row.profileCode ? (
          <Link href={`/dashboard/admin/profiles/${row.profileId}`} className="text-primary hover:underline">
            {row.profileCode}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "name", header: "Name", sortable: true },
    { key: "phone", header: "Phone" },
    {
      key: "assignedToName",
      header: "Assigned To",
      sortable: true,
      render: (row) =>
        row.assignedToName ?? <span className="text-muted-foreground">Unassigned</span>,
    },
    {
      key: "lastSharedAt",
      header: "Last Shared",
      sortable: true,
      accessor: (row) => (row.lastSharedAt ? new Date(row.lastSharedAt).getTime() : 0),
      render: (row) =>
        row.lastSharedAt ? (
          new Date(row.lastSharedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })
        ) : (
          <span className="font-medium text-red-600">Never shared</span>
        ),
    },
    {
      key: "daysSinceLastShare",
      header: "Days Since",
      sortable: true,
      accessor: (row) => row.daysSinceLastShare,
      render: (row) => (
        <Badge
          variant="outline"
          className={cn(
            "tabular-nums",
            row.daysSinceLastShare >= 14
              ? "border-red-200 bg-red-100 text-red-700"
              : "border-amber-200 bg-amber-100 text-amber-700"
          )}
        >
          {row.daysSinceLastShare}d
        </Badge>
      ),
    },
    {
      key: "subscriptionStart",
      header: "Subscription Since",
      sortable: true,
      accessor: (row) => new Date(row.subscriptionStart).getTime(),
      render: (row) => new Date(row.subscriptionStart).toLocaleDateString("en-IN", { dateStyle: "medium" }),
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      searchPlaceholder="Search clients..."
      emptyMessage="No missed weekly shares — every active client has been sent profiles recently."
    />
  );
}
