import { LEAD_STATUS_LABELS } from "@/lib/leads/lead-status";

export type TimelineEntry = {
  id: string;
  outcome: string;
  status: string | null;
  remark: string | null;
  followUpDate: Date | string | null;
  createdAt: Date | string;
  actor: { name: string };
};

const OUTCOME_STYLES: Record<string, string> = {
  INTERESTED: "border-green-200 bg-green-50 text-green-700",
  FOLLOW_UP: "border-amber-200 bg-amber-50 text-amber-700",
  NOT_INTERESTED: "border-red-200 bg-red-50 text-red-700",
  DNP: "border-gray-200 bg-gray-50 text-gray-600",
};

function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

// Follow-ups saved as a plain date are stored at 00:00 UTC; show those without a time.
function formatFollowUp(v: Date | string) {
  const d = new Date(v);
  const dateOnly = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  return dateOnly
    ? d.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "UTC" })
    : formatDateTime(d);
}

export function LeadTimelineList({
  entries,
  legacyNotes,
}: {
  entries: TimelineEntry[];
  legacyNotes: string | null;
}) {
  if (entries.length === 0 && !legacyNotes) {
    return <p className="text-sm text-muted-foreground">No comments yet.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map((e) => {
        const label = e.status ? LEAD_STATUS_LABELS[e.status] ?? e.status : e.outcome.replace(/_/g, " ");
        return (
          <div key={e.id} className="rounded-md border bg-background p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                  OUTCOME_STYLES[e.outcome] ?? "border-border bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</span>
            </div>
            {e.remark && <p className="mt-2 whitespace-pre-wrap">{e.remark}</p>}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>By {e.actor.name}</span>
              {e.followUpDate && (
                <span className="font-medium text-foreground">Follow-up: {formatFollowUp(e.followUpDate)}</span>
              )}
            </div>
          </div>
        );
      })}

      {legacyNotes && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="mb-1 text-xs font-semibold text-amber-800">
            Old CRM / website note (no timestamp)
          </div>
          <p className="whitespace-pre-wrap text-amber-900">{legacyNotes}</p>
        </div>
      )}
    </div>
  );
}
