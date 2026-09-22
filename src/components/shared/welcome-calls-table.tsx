"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markWelcomeCallCompleteAction } from "@/actions/welcome-calls/welcome-call.actions";
import { Upload, CheckCircle2, ExternalLink } from "lucide-react";

type Row = {
  id: string;
  status: "PENDING" | "COMPLETED";
  attachmentUrl: string | null;
  createdAt: Date;
  lead: { id: string; name: string; phone: string } | null;
  profile: { id: string; name: string; phone: string; profileCode: string } | null;
  assignedTo: { id: string; name: string; role: string } | null;
};

function RowActions({ row }: { row: Row }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || "Upload failed");
          return;
        }
        await markWelcomeCallCompleteAction(row.id, data.url);
      } catch {
        setError("Something went wrong.");
      }
    });
  }

  if (row.status === "COMPLETED") {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
        </Badge>
        {row.attachmentUrl && (
          <a href={row.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input px-2.5 py-1 text-xs font-medium hover:bg-accent/10">
        <Upload className="h-3.5 w-3.5" />
        {isPending ? "Uploading..." : "Upload & Complete"}
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={isPending} />
      </label>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

export function WelcomeCallsTable({ rows, showAssignee = false }: { rows: Row[]; showAssignee?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
            <th className="p-3 font-medium">Contact</th>
            <th className="p-3 font-medium">Type</th>
            {showAssignee && <th className="p-3 font-medium">Assigned To</th>}
            <th className="p-3 font-medium">Assigned On</th>
            <th className="p-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const contact = row.lead ?? row.profile;
            return (
              <tr key={row.id} className="border-b last:border-0">
                <td className="p-3">
                  <p className="font-medium">{contact?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{contact?.phone ?? "—"}</p>
                </td>
                <td className="p-3 text-muted-foreground">{row.lead ? "Lead" : "Profile"}</td>
                {showAssignee && (
                  <td className="p-3">
                    {row.assignedTo ? (
                      <>
                        {row.assignedTo.name}
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          ({SERVICE_ROLE_LABEL(row.assignedTo.role)})
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Unassigned</span>
                    )}
                  </td>
                )}
                <td className="p-3 text-muted-foreground">
                  {new Date(row.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="p-3">
                  <RowActions row={row} />
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={showAssignee ? 5 : 4} className="p-8 text-center text-muted-foreground">
                No welcome calls yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SERVICE_ROLE_LABEL(role: string) {
  return role.startsWith("SALES") ? "Sales" : role.startsWith("SERVICE") ? "Service" : role;
}