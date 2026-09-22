"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

export function ExportButton<T extends Record<string, unknown>>({
  data,
  filename,
  label = "Export",
}: {
  data: T[];
  filename: string;
  label?: string;
}) {
  function handleExport() {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
      <Download className="mr-2 h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
