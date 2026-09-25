"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PPRequestSummary } from "@/lib/stats/pp-validation";
import type { RefOption } from "@/components/pp-validation/pp-criteria-fields";
import { getPPRequestForEdit } from "@/lib/stats/pp-validation";
import { PPRequestForm, type PPRequestFormInitial } from "@/components/pp-validation/pp-request-form";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-300",
  NEEDS_REVISION: "bg-red-100 text-red-700 border-red-300",
};

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function PPRequestsList({
  requests,
  religions,
  castes,
  motherTongues,
  loadForEdit,
}: {
  requests: PPRequestSummary[];
  religions: RefOption[];
  castes: RefOption[];
  motherTongues: RefOption[];
  loadForEdit: (id: string) => Promise<PPRequestFormInitial | null>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<PPRequestFormInitial | null>(null);
  const [loading, setLoading] = useState(false);

  async function startEdit(id: string) {
    setLoading(true);
    const data = await loadForEdit(id);
    setLoading(false);
    if (!data) return;
    setEditData(data);
    setEditingId(id);
  }

  if (requests.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No requests sent yet.</p>;
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <Card key={r.id}>
          <CardContent className="space-y-2 pt-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{r.clientName}</span>
              <span className="text-xs text-muted-foreground">{r.clientPhone}</span>
              <span className={cn("rounded-full border px-2 py-0.5 text-xs", STATUS_STYLE[r.status])}>
                {r.status.replace("_", " ")}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">Updated {fmt(r.updatedAt)}</span>
            </div>
            {r.latestNote && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">Note: {r.latestNote}</p>
            )}
            {r.status === "NEEDS_REVISION" && editingId !== r.id && (
              <Button size="sm" variant="outline" disabled={loading} onClick={() => startEdit(r.id)}>
                Edit &amp; resubmit
              </Button>
            )}
            {editingId === r.id && editData && (
              <div className="pt-2">
                <PPRequestForm
                  editRequestId={r.id}
                  initial={editData}
                  religions={religions}
                  castes={castes}
                  motherTongues={motherTongues}
                  onDone={() => setEditingId(null)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
