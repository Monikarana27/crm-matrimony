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

type CallLogRow = {
  id: string;
  outcome: string;
  notes: string | null;
  calledAt: Date;
  durationSeconds: number | null;
  nextFollowUpAt: Date | null;
  recordingUrl: string | null;
  qualityScore: number | null;
  profile: { id: string; name: string; profileCode: string };
  createdBy: { id: string; name: string } | null;
};

const OUTCOME_STYLES: Record<string, string> = {
  CONNECTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  NOT_ANSWERED: "bg-amber-100 text-amber-700 border-amber-200",
  BUSY: "bg-orange-100 text-orange-700 border-orange-200",
  WRONG_NUMBER: "bg-red-100 text-red-700 border-red-200",
  INTERESTED: "bg-green-100 text-green-700 border-green-200",
  CALLBACK: "bg-purple-100 text-purple-700 border-purple-200",
  INVALID_NUMBER: "bg-red-100 text-red-700 border-red-200",
  FOLLOW_UP_NEEDED: "bg-blue-100 text-blue-700 border-blue-200",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CallLogsTable({ callLogs, showEmployeeFilter = true }: { callLogs: CallLogRow[]; showEmployeeFilter?: boolean }) {
  const [outcomeFilter, setOutcomeFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");

  const employeeOptions = useMemo(() => {
    const map = new Map<string, string>();
    callLogs.forEach((c) => {
      if (c.createdBy) map.set(c.createdBy.id, c.createdBy.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [callLogs]);

  const filtered = useMemo(() => {
    return callLogs.filter((c) => {
      if (outcomeFilter !== "ALL" && c.outcome !== outcomeFilter) return false;
      if (employeeFilter !== "ALL" && c.createdBy?.id !== employeeFilter) return false;
      return true;
    });
  }, [callLogs, outcomeFilter, employeeFilter]);

  const columns: Column<CallLogRow>[] = [
    {
      key: "profile",
      header: "Profile",
      render: (row) => (
        <span className="font-medium">
          {row.profile.name}{" "}
          <span className="text-xs text-muted-foreground">
            ({row.profile.profileCode})
          </span>
        </span>
      ),
    },
    {
      key: "outcome",
      header: "Outcome",
      render: (row) => (
        <Badge variant="outline" className={OUTCOME_STYLES[row.outcome] ?? ""}>
          {row.outcome.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (row) => formatDuration(row.durationSeconds),
    },
    {
      key: "createdBy",
      header: "Employee",
      render: (row) => row.createdBy?.name ?? "—",
    },
    {
      key: "nextFollowUpAt",
      header: "Next Follow-up",
      sortable: true,
      accessor: (row) => (row.nextFollowUpAt ? new Date(row.nextFollowUpAt).getTime() : 0),
      render: (row) => (row.nextFollowUpAt ? new Date(row.nextFollowUpAt).toLocaleDateString("en-IN") : "—"),
    },
    {
      key: "calledAt",
      header: "Called At",
      sortable: true,
      accessor: (row) => new Date(row.calledAt).getTime(),
      render: (row) =>
        new Date(row.calledAt).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
    },
    {
      key: "notes",
      header: "Notes",
      render: (row) => (
        <span className="max-w-xs truncate text-sm text-muted-foreground">
          {row.notes ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Outcomes</SelectItem>
            {Object.keys(OUTCOME_STYLES).map((o) => (
              <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showEmployeeFilter && (
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Employees</SelectItem>
              {employeeOptions.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Search by profile name..."
        emptyMessage="No calls logged yet."
      />
    </div>
  );
}