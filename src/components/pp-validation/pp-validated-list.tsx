import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PPReviewedRow } from "@/lib/stats/pp-validation";

const DECISION_STYLE: Record<PPReviewedRow["decision"], string> = {
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-300",
  NEEDS_REVISION: "bg-red-100 text-red-700 border-red-300",
};

function fmtDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function PPValidatedList({ rows }: { rows: PPReviewedRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">You have not validated any requests yet.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span>{r.clientName}</span>
              <span className="text-xs font-normal text-muted-foreground">{r.clientPhone}</span>
              {r.submittedByName && (
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-normal">
                  From {r.submittedByName}
                </span>
              )}
              <span className={cn("rounded-full border px-2 py-0.5 text-xs font-normal", DECISION_STYLE[r.decision])}>
                {r.decision === "APPROVED" ? "Approved" : "Needs revision"}
              </span>
              <span className="ml-auto text-xs font-normal text-muted-foreground">{fmtDateTime(r.reviewedAt)}</span>
            </CardTitle>
            {r.packageDetails && <p className="text-xs text-muted-foreground">{r.packageDetails}</p>}
          </CardHeader>
          <CardContent className="space-y-1 pt-0 text-sm">
            {r.matchesFound !== null && (
              <p className="text-muted-foreground">Matches found: {r.matchesFound}</p>
            )}
            {r.decision === "APPROVED" && r.assignedEmployeeName && (
              <p className="text-muted-foreground">Assigned RM: {r.assignedEmployeeName}</p>
            )}
            {r.decision === "NEEDS_REVISION" && r.currentStatus === "PENDING" && (
              <p className="text-amber-700">Resubmitted by Sales, back in Pending.</p>
            )}
            {r.note && <p className="whitespace-pre-wrap">Note: {r.note}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
