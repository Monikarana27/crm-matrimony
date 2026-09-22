"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileSpreadsheet, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExpiringRow = {
  id: string;
  profileId: string;
  profileName: string;
  profileCode: string;
  planName: string;
  endDate: string; // ISO
};

function daysLeftOf(endDateIso: string) {
  return Math.ceil((new Date(endDateIso).getTime() - Date.now()) / 86400000);
}

function urgencyBadgeClass(daysLeft: number) {
  if (daysLeft <= 7) {
    return "bg-destructive/10 text-destructive border-destructive/20";
  }
  if (daysLeft <= 15) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-muted text-muted-foreground border-transparent";
}

export function ExpiringSubscriptionsTable({ rows }: { rows: ExpiringRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.profileName.toLowerCase().includes(q) ||
        r.profileCode.toLowerCase().includes(q) ||
        r.planName.toLowerCase().includes(q)
    );
  }, [rows, query]);

  function handleExport() {
    const data = filtered.map((r) => ({
      "Profile Name": r.profileName,
      "Profile Code": r.profileCode,
      Plan: r.planName,
      "End Date": new Date(r.endDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      "Days Left": daysLeftOf(r.endDate),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expiring Soon");

    const filename = `expiring-subscriptions-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code, or plan..."
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="gap-1.5 self-start sm:self-auto"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export to Excel
          </Button>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {rows.length === 0 ? "Nothing expiring soon." : "No matches for your search."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">End Date</th>
                  <th className="px-4 py-3 text-right">Days Left</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const daysLeft = daysLeftOf(r.endDate);
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/admin/profiles/${r.profileId}`}
                          className="font-medium hover:underline"
                        >
                          {r.profileName}
                        </Link>
                        <div className="text-xs text-muted-foreground">{r.profileCode}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.planName}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(r.endDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            urgencyBadgeClass(daysLeft)
                          )}
                        >
                          {daysLeft} {daysLeft === 1 ? "day" : "days"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
