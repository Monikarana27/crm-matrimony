"use client";

import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";

type LogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
  actor: { id: string; name: string; role: string } | null;
};

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  UPDATE: "bg-blue-100 text-blue-700 border-blue-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
  ACTIVATE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  DEACTIVATE: "bg-red-100 text-red-700 border-red-200",
  ASSIGN: "bg-violet-100 text-violet-700 border-violet-200",
  CONVERT: "bg-amber-100 text-amber-700 border-amber-200",
};

function getActionColor(action: string): string {
  const key = Object.keys(ACTION_STYLES).find((k) => action.includes(k));
  return key ? ACTION_STYLES[key] : "bg-gray-100 text-gray-700 border-gray-200";
}

export function ActivityLogsTable({ logs }: { logs: LogRow[] }) {
  const columns: Column<LogRow>[] = [
    {
      key: "createdAt",
      header: "Timestamp",
      sortable: true,
      accessor: (row) => new Date(row.createdAt).getTime(),
      render: (row) =>
        new Date(row.createdAt).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
    },
    {
      key: "actor",
      header: "Performed By",
      render: (row) => (
        <span>
          {row.actor?.name ?? "System"}{" "}
          {row.actor?.role && (
            <span className="text-xs text-muted-foreground">({row.actor.role})</span>
          )}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      render: (row) => (
        <Badge variant="outline" className={getActionColor(row.action)}>
          {row.action.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "entityType",
      header: "Entity",
      sortable: true,
    },
    {
      key: "entityId",
      header: "Entity ID",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.entityId.slice(0, 12)}...
        </span>
      ),
    },
  ];

  return (
    <DataTable
      data={logs}
      columns={columns}
      searchPlaceholder="Search by actor, action, or entity..."
      emptyMessage="No activity recorded yet."
    />
  );
}