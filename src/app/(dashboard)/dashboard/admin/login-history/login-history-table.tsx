"use client";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";

type EventRow = {
  id: string;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  user: { name: string; role: string };
};

function shortUserAgent(ua: string | null): string {
  if (!ua) return "—";
  if (ua.includes("Mobile")) return "Mobile browser";
  const match = ua.match(/(Chrome|Firefox|Safari|Edge|OPR)\/[\d.]+/);
  return match ? match[0].split("/")[0] : ua.slice(0, 30);
}

export function LoginHistoryTable({ events }: { events: EventRow[] }) {
  const columns: Column<EventRow>[] = [
    { key: "userName", header: "User", sortable: true, accessor: (row) => row.user.name, render: (row) => row.user.name },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.user.role}
        </Badge>
      ),
    },
    {
      key: "ipAddress",
      header: "IP Address",
      render: (row) => row.ipAddress ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "userAgent",
      header: "Browser",
      render: (row) => shortUserAgent(row.userAgent),
    },
    {
      key: "createdAt",
      header: "Logged In At",
      sortable: true,
      accessor: (row) => new Date(row.createdAt).getTime(),
      render: (row) => new Date(row.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    },
  ];

  return (
    <DataTable
      data={events}
      columns={columns}
      searchPlaceholder="Search by name, role, or IP..."
      emptyMessage="No login events recorded yet."
    />
  );
}
