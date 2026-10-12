"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/shared/data-table";
import { getTargetReport } from "@/actions/sales-targets/sales-target.actions";

type ReportRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  targetAmount: number | null;
  achievedAmount: number;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(month: number, year: number) {
  return `${MONTHS[month - 1]} ${year}`;
}

export function TargetReportView() {
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() + 1;

  const [startMonth, setStartMonth] = useState(defaultMonth);
  const [startYear, setStartYear] = useState(defaultYear);
  const [endMonth, setEndMonth] = useState(defaultMonth);
  const [endYear, setEndYear] = useState(defaultYear);
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runReport() {
    setError(null);
    startTransition(async () => {
      try {
        const data = await getTargetReport({ startMonth, startYear, endMonth, endYear });
        setRows(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report");
        setRows(null);
      }
    });
  }

  const columns: Column<ReportRow>[] = [
    { key: "employeeName", header: "Employee", sortable: true, width: 180 },
    {
      key: "month",
      header: "Month",
      sortable: true,
      accessor: (row) => row.year * 12 + row.month,
      render: (row) => monthLabel(row.month, row.year),
    },
    {
      key: "targetAmount",
      header: "Target",
      sortable: true,
      accessor: (row) => row.targetAmount ?? -1,
      render: (row) =>
        row.targetAmount !== null ? `₹${row.targetAmount.toLocaleString("en-IN")}` : "—",
    },
    {
      key: "achievedAmount",
      header: "Achieved",
      sortable: true,
      render: (row) => `₹${row.achievedAmount.toLocaleString("en-IN")}`,
    },
    {
      key: "pct",
      header: "%",
      sortable: true,
      accessor: (row) =>
        row.targetAmount && row.targetAmount > 0
          ? (row.achievedAmount / row.targetAmount) * 100
          : -1,
      render: (row) => {
        if (!row.targetAmount || row.targetAmount <= 0) return "—";
        const pct = (row.achievedAmount / row.targetAmount) * 100;
        return (
          <span className={pct >= 100 ? "font-semibold text-emerald-600" : ""}>
            {pct.toFixed(0)}%
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <div className="flex gap-2">
              <Select value={String(startMonth)} onValueChange={(v) => setStartMonth(Number(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                className="w-[90px]"
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <div className="flex gap-2">
              <Select value={String(endMonth)} onValueChange={(v) => setEndMonth(Number(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                className="w-[90px]"
                value={endYear}
                onChange={(e) => setEndYear(Number(e.target.value))}
              />
            </div>
          </div>
          <Button onClick={runReport} disabled={isPending}>
            {isPending ? "Loading..." : "Run Report"}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {rows !== null && (
        <DataTable
          data={rows}
          columns={columns}
          searchPlaceholder="Search by employee or month..."
          emptyMessage="No target or achievement data in this range."
        />
      )}
    </div>
  );
}
