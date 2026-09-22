"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { sendMatchedProfilesAction } from "@/actions/profiles/send-matches.action";
import { getAlreadySharedProfileIdsAction } from "@/actions/profile-shares/profile-share.actions";

type Match = {
  id: string;
  name: string;
  profileCode: string;
  city: string | null;
  religion: string | null;
  score: number;
  tier: "Excellent" | "Good" | "Fair" | "Low";
  reasons: string[];
  gaps: string[];
  age: number | null;
  profession: string | null;
};

const PAGE_SIZE = 10;

const TIER_STYLE: Record<Match["tier"], string> = {
  Excellent: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Good: "bg-blue-100 text-blue-700 border-blue-200",
  Fair: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-muted text-muted-foreground border-border",
};

const TIER_BAR: Record<Match["tier"], string> = {
  Excellent: "bg-emerald-500",
  Good: "bg-blue-500",
  Fair: "bg-amber-500",
  Low: "bg-muted-foreground/40",
};

const profileHref = (id: string) => `/dashboard/service/profiles/${id}`;

function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const sorted = Array.from(keep)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function MatchingResults({
  matches,
  clientEmail,
  clientProfileId,
}: {
  matches: Match[];
  clientEmail: string;
  clientProfileId: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [email, setEmail] = useState(clientEmail);
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [alreadySent, setAlreadySent] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAlreadySharedProfileIdsAction(clientProfileId).then((ids) => setAlreadySent(new Set(ids)));
  }, [clientProfileId]);

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const visible = matches.slice(start, start + PAGE_SIZE);

  function goTo(p: number) {
    setPage(Math.min(Math.max(1, p), totalPages));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggle(id: string) {
    if (alreadySent.has(id)) return;
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <div ref={topRef} className="mx-auto max-w-3xl space-y-4">
      {matches.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {matches.length} best matches, ranked by overall fit. Percentages weigh the client&apos;s
            preferences, how well the client fits theirs, and general compatibility.
          </p>
          <p className="text-xs text-muted-foreground">
            Showing {start + 1}–{start + visible.length} of {matches.length}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {visible.map((m, i) => {
          const sentAlready = alreadySent.has(m.id);
          const isSelected = selected.includes(m.id);
          return (
            <label
              key={m.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition ${
                sentAlready ? "bg-muted/40 opacity-60" : "hover:shadow-md"
              } ${isSelected ? "border-primary ring-1 ring-primary" : ""}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                {start + i + 1}
              </div>
              <input
                type="checkbox"
                className="mt-2 h-4 w-4"
                checked={isSelected}
                disabled={sentAlready}
                onChange={() => toggle(m.id)}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">
                      {m.name}{" "}
                      <Link
                        href={profileHref(m.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-normal text-primary underline-offset-2 hover:underline"
                      >
                        {m.profileCode}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[m.age ? `${m.age} yrs` : null, m.profession, m.city, m.religion]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLE[m.tier]}`}>
                      {m.score}% · {m.tier}
                    </span>
                    {sentAlready && <span className="text-xs text-green-600">✓ Sent</span>}
                  </div>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${TIER_BAR[m.tier]}`}
                    style={{ width: `${Math.max(0, Math.min(100, m.score))}%` }}
                  />
                </div>

                {m.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.reasons.map((r) => (
                      <span key={r} className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                )}
                {m.gaps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.gaps.map((g) => (
                      <span key={g} className="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                        ! {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </label>
          );
        })}
        {matches.length === 0 && (
          <p className="text-sm text-muted-foreground">No compatible profiles found.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => goTo(page - 1)}>
            Previous
          </Button>
          {pageList(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                size="sm"
                variant={p === page ? "default" : "outline"}
                onClick={() => goTo(p)}
              >
                {p}
              </Button>
            )
          )}
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => goTo(page + 1)}>
            Next
          </Button>
        </div>
      )}

      {note && <p className="text-sm text-muted-foreground">{note}</p>}

      {matches.length > 0 && (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t bg-background/95 py-3 backdrop-blur">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@email.com"
            className="h-10 w-64 rounded-md border border-input px-3 text-sm"
          />
          <Button
            disabled={isPending || selected.length === 0 || !email}
            onClick={() =>
              startTransition(async () => {
                const result = await sendMatchedProfilesAction(clientProfileId, email, selected);
                getAlreadySharedProfileIdsAction(clientProfileId).then((ids) => setAlreadySent(new Set(ids)));
                setNote(
                  result.error
                    ? result.error
                    : result.skippedNames.length > 0
                    ? `Sent ${result.sentCount}. Skipped (already sent earlier): ${result.skippedNames.join(", ")}`
                    : null
                );
                setSelected([]);
                setSent(!result.error);
              })
            }
          >
            {isPending
              ? "Sending..."
              : selected.length > 0
              ? `Send ${selected.length} Profiles`
              : sent
              ? "Sent ✓"
              : "Send 0 Profiles"}
          </Button>
          {selected.length > 0 && (
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
          )}
        </div>
      )}
    </div>
  );
}
