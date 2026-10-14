"use client";
import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientCallRow, EmployeeRating } from "@/lib/stats/sme-client-reviews";
import {
  logSmeClientCallAction,
  logSmeClientAttemptAction,
  scheduleSmeClientFollowUpAction,
} from "@/actions/sme/sme-client-review.actions";

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
const tone = (avg: number | null) =>
  avg === null ? "text-muted-foreground" : avg >= 4 ? "text-emerald-600" : avg >= 3 ? "text-amber-600" : "text-red-600";
const fmt = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const CALL_STATUSES = [
  { value: "ANSWERED", label: "Answered" },
  { value: "NOT_PICKED", label: "Didn't pick" },
  { value: "BUSY", label: "Busy" },
  { value: "SWITCHED_OFF", label: "Switched off" },
  { value: "CALL_BACK_LATER", label: "Call back later" },
  { value: "WRONG_NUMBER", label: "Wrong number" },
];
const ATTEMPT_LABEL: Record<string, string> = Object.fromEntries(
  CALL_STATUSES.map((s) => [s.value, s.label])
);

export function SmeClientCalls({
  rows,
  ratings,
  employees,
}: {
  rows: ClientCallRow[];
  ratings: EmployeeRating[];
  employees: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openLog, setOpenLog] = useState<string | null>(null);
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [callStatus, setCallStatus] = useState("ANSWERED");
  const [attemptNote, setAttemptNote] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const ratingMap = useMemo(() => new Map(ratings.map((r) => [r.employeeId, r])), [ratings]);

  // worst-rated first, unrated last
  const ordered = useMemo(
    () =>
      [...employees].sort((a, b) => {
        const ra = ratingMap.get(a.id)?.avg ?? null;
        const rb = ratingMap.get(b.id)?.avg ?? null;
        if (ra === null && rb === null) return a.name.localeCompare(b.name);
        if (ra === null) return 1;
        if (rb === null) return -1;
        return ra - rb;
      }),
    [employees, ratingMap]
  );

  const [selected, setSelected] = useState<string>(ordered[0]?.id ?? "");

  const clients = useMemo(
    () =>
      rows
        .filter((r) => r.employeeId === selected)
        .sort((a, b) => {
          // never called first, then oldest call first
          const ta = a.calls[0] ? new Date(a.calls[0].createdAt).getTime() : -Infinity;
          const tb = b.calls[0] ? new Date(b.calls[0].createdAt).getTime() : -Infinity;
          return ta - tb;
        }),
    [rows, selected]
  );

  function startLog(id: string) {
    setOpenLog(id);
    setRating(0);
    setFeedback("");
    setCallStatus("ANSWERED");
    setAttemptNote("");
    setFollowUpNote("");
    setFollowUpDate("");
    setError(null);
  }

  function save(subscriptionId: string) {
    setError(null);
    if (callStatus === "ANSWERED") {
      if (!rating) return setError("Pick a rating");
      if (!feedback.trim()) return setError("Write what the client said");
    }
    startTransition(async () => {
      try {
        if (callStatus === "ANSWERED") {
          await logSmeClientCallAction({ subscriptionId, rating, feedback });
        } else {
          await logSmeClientAttemptAction({ subscriptionId, status: callStatus, note: attemptNote });
        }
        if (followUpDate || followUpNote.trim()) {
          await scheduleSmeClientFollowUpAction({
            subscriptionId,
            note: followUpNote,
            followUpDate: followUpDate || null,
          });
        }
        setOpenLog(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  if (employees.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No Service employees found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((e) => {
          const r = ratingMap.get(e.id);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                setSelected(e.id);
                setOpenLog(null);
                setOpenHistory(null);
              }}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors hover:bg-muted",
                selected === e.id && "border-primary bg-muted"
              )}
            >
              <p className="text-sm font-medium">{e.name}</p>
              <p className={cn("text-2xl font-semibold", tone(r?.avg ?? null))}>
                {r?.avg != null ? `${r.avg.toFixed(1)} ★` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {r ? `${r.reviewed} of ${r.total} ongoing clients reviewed` : "No ongoing clients"}
              </p>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Ongoing clients of {employees.find((e) => e.id === selected)?.name ?? "—"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Call the client, log what they said and rate the employee 1-5. Calling again adds a new
            entry; the latest one is the current rating.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {clients.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No ongoing clients.</p>
          )}
          {clients.map((c) => {
            const last = c.calls[0];
            return (
              <div key={c.subscriptionId} className="space-y-2 rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">
                    {c.clientName} ·{" "}
                    <a
                      href={`/dashboard/service/profiles/${c.profileId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      {c.profileCode}
                    </a>
                  </span>
                  {c.planName && <span className="text-xs text-muted-foreground">{c.planName}</span>}
                  {c.status === "HOLD" && (
                    <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      On hold
                    </span>
                  )}
                  {last ? (
                    <span className={cn("ml-auto text-sm", tone(last.rating))}>
                      {stars(last.rating)}{" "}
                      <span className="text-xs text-muted-foreground">called {fmt(last.createdAt)}</span>
                    </span>
                  ) : (
                    <span className="ml-auto rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                      Not yet called
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <a href={`tel:${c.phone}`} className="hover:underline">
                    📞 {c.phone}
                    {c.contactPerson ? <span className="text-xs text-muted-foreground"> ({c.contactPerson})</span> : null}
                  </a>
                  {c.altPhone && (
                    <a href={`tel:${c.altPhone}`} className="hover:underline">
                      Alt: {c.altPhone}
                    </a>
                  )}
                </div>

                {last && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{last.feedback}</p>}

                {c.attempts[0] && (!last || new Date(c.attempts[0].createdAt) > new Date(last.createdAt)) && (
                  <p className="text-xs text-amber-700">
                    Tried {fmt(c.attempts[0].createdAt)} · {ATTEMPT_LABEL[c.attempts[0].status] ?? c.attempts[0].status}
                    {c.attempts[0].note ? ` — ${c.attempts[0].note}` : ""}
                  </p>
                )}

                {openLog === c.subscriptionId ? (
                  <div className="space-y-2 rounded-md bg-muted/50 p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {CALL_STATUSES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setCallStatus(s.value)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs",
                            callStatus === s.value ? "border-primary bg-primary/10 text-primary" : "border-border"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    {callStatus === "ANSWERED" ? (
                      <>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setRating(n)}
                              className={cn(
                                "h-9 w-9 rounded-md border text-sm",
                                rating >= n ? "border-amber-400 bg-amber-100 text-amber-700" : "border-border"
                              )}
                              aria-label={`${n} star${n > 1 ? "s" : ""}`}
                            >
                              {n}
                            </button>
                          ))}
                          <span className="ml-2 text-xs text-muted-foreground">Rating for the employee</span>
                        </div>
                        <textarea
                          className={cn(fieldClass, "min-h-[80px]")}
                          placeholder="What did the client say about the service they're getting?"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                        />
                      </>
                    ) : (
                      <textarea
                        className={cn(fieldClass, "min-h-[60px]")}
                        placeholder="Optional note (e.g. phone rang out, try again in the evening)"
                        value={attemptNote}
                        onChange={(e) => setAttemptNote(e.target.value)}
                      />
                    )}
                    <div className="space-y-1 rounded-md border border-dashed border-border p-2">
                      <p className="text-xs font-semibold text-muted-foreground">FOLLOW-UP (optional)</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="datetime-local"
                          className={cn(fieldClass, "w-auto")}
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                        />
                        <input
                          type="text"
                          className={cn(fieldClass, "min-w-[160px] flex-1")}
                          placeholder="Follow-up note (defaults to: Call back)"
                          value={followUpNote}
                          onChange={(e) => setFollowUpNote(e.target.value)}
                        />
                      </div>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" disabled={isPending} onClick={() => save(c.subscriptionId)}>
                        {isPending ? "Saving..." : callStatus === "ANSWERED" ? "Save call" : "Save attempt"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setOpenLog(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => startLog(c.subscriptionId)}>
                      {last ? "Call again" : "Log call"}
                    </Button>
                    {c.calls.length + c.attempts.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setOpenHistory(openHistory === c.subscriptionId ? null : c.subscriptionId)
                        }
                      >
                        History ({c.calls.length + c.attempts.length})
                      </Button>
                    )}
                  </div>
                )}

                {openHistory === c.subscriptionId && (
                  <div className="space-y-2 border-l-2 pl-3">
                    {[
                      ...c.calls.map((h) => ({ kind: "call" as const, id: h.id, at: h.createdAt, h })),
                      ...c.attempts.map((a) => ({ kind: "attempt" as const, id: a.id, at: a.createdAt, a })),
                    ]
                      .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
                      .map((item) =>
                        item.kind === "call" ? (
                          <div key={item.id} className="text-sm">
                            <span className={tone(item.h.rating)}>{stars(item.h.rating)}</span>{" "}
                            <span className="text-xs text-muted-foreground">{fmt(item.at)} · answered</span>
                            <p className="whitespace-pre-wrap text-muted-foreground">{item.h.feedback}</p>
                          </div>
                        ) : (
                          <div key={item.id} className="text-sm">
                            <span className="text-amber-700">{ATTEMPT_LABEL[item.a.status] ?? item.a.status}</span>{" "}
                            <span className="text-xs text-muted-foreground">{fmt(item.at)}</span>
                            {item.a.note && (
                              <p className="whitespace-pre-wrap text-muted-foreground">{item.a.note}</p>
                            )}
                          </div>
                        )
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
