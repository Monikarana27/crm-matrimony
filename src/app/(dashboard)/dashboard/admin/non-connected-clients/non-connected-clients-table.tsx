"use client";
import Link from "next/link";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";

type ClientRow = {
  subscriptionId: string;
  profileId: string;
  name: string;
  profileCode: string | null;
  phone: string;
  lastActivity: Date;
};

export function NonConnectedClientsTable({ clients }: { clients: readonly ClientRow[] }) {
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
      key: "lastActivity",
      header: "Last Activity",
      sortable: true,
      accessor: (row) => new Date(row.lastActivity).getTime(),
      render: (row) => {
        const days = Math.floor((Date.now() - new Date(row.lastActivity).getTime()) / (24 * 60 * 60 * 1000));
        return (
          <div className="flex items-center gap-2">
            <span>{new Date(row.lastActivity).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
              {days}d ago
            </Badge>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      searchPlaceholder="Search clients..."
      emptyMessage="No non-connected clients right now — everyone's been updated recently."
    />
  );
}
