import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PhoneCall, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import type { WelcomeCallSummary } from "@/lib/stats/welcome-call-summary";

export function WelcomeCallsHighlight({ summary }: { summary: WelcomeCallSummary }) {
  const { pending, overdue, calls, teamScope } = summary;

  const tone =
    pending === 0
      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
      : overdue > 0
      ? "border-red-400 bg-red-50 dark:bg-red-950/30"
      : "border-amber-400 bg-amber-50 dark:bg-amber-950/30";
  const iconTone =
    pending === 0 ? "text-emerald-600" : overdue > 0 ? "text-red-600" : "text-amber-600";

  return (
    <Card className={`border-2 shadow-md ${tone}`}>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background/80 shadow-sm">
              {pending === 0 ? (
                <CheckCircle2 className={`h-5 w-5 ${iconTone}`} />
              ) : (
                <PhoneCall className={`h-5 w-5 ${iconTone}`} />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold">Welcome Calls</h2>
              <p className="text-sm text-muted-foreground">
                {teamScope ? "Pending for you and your team" : "Pending calls assigned to you"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums">{pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold tabular-nums ${overdue > 0 ? "text-red-600" : ""}`}>{overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue (24h+)</p>
            </div>
            <Link
              href="/dashboard/welcome-calls?status=PENDING"
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {pending === 0 ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            All caught up — no pending welcome calls.
          </p>
        ) : (
          <>
            <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {calls.map((c) => (
                <li key={c.id} className="rounded-lg border bg-background/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-tight">{c.name}</p>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 text-xs ${
                        c.overdue ? "font-semibold text-red-600" : "text-muted-foreground"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {c.waitingLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {c.code ? `${c.code} · ` : ""}
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="text-primary hover:underline">
                        {c.phone}
                      </a>
                    ) : (
                      "No phone"
                    )}
                  </p>
                  {c.assignee && <p className="mt-1 text-xs text-muted-foreground">Assigned to {c.assignee}</p>}
                </li>
              ))}
            </ul>
            {pending > calls.length && (
              <p className="text-xs text-muted-foreground">
                Showing the {calls.length} oldest — {pending - calls.length} more on the full list.
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
