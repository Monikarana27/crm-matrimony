"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getWelcomeCallHistory } from "@/actions/welcome-calls/welcome-call-log.actions";
import { History } from "lucide-react";

type LogRow = {
  id: string;
  status: "PENDING" | "COMPLETED" | "MISSED" | "RESCHEDULED";
  nextCallTime: Date | null;
  note: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string } | null;
};

function statusBadge(status: LogRow["status"]) {
  const styles: Record<LogRow["status"], string> = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    MISSED: "border-red-200 bg-red-100 text-red-700",
    RESCHEDULED: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return (
    <Badge variant="outline" className={styles[status]}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

export function CallHistoryDialog({
  welcomeCallId,
  clientName,
}: {
  welcomeCallId: string;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v && !logs) {
      startTransition(async () => {
        const data = await getWelcomeCallHistory(welcomeCallId);
        setLogs(data as LogRow[]);
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-white hover:bg-slate-900"
          title="Call History"
        >
          <History className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Call History — {clientName}</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          {isPending && !logs ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Loading...</p>
          ) : logs && logs.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="p-2 font-medium">S.No</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Next Call Time</th>
                  <th className="p-2 font-medium">Notes</th>
                  <th className="p-2 font-medium">Created At</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2">{statusBadge(log.status)}</td>
                    <td className="p-2 text-muted-foreground">
                      {log.nextCallTime ? new Date(log.nextCallTime).toLocaleString("en-IN") : "—"}
                    </td>
                    <td className="p-2 text-muted-foreground">{log.note || "—"}</td>
                    <td className="p-2 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                      {log.createdBy && <span className="ml-1">· {log.createdBy.name}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">No call log activity yet.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
