import Link from "next/link";
import { requireRole } from "@/lib/permissions/guard";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import {
  getStaffHistory,
  getStaffTimeline,
  istToday,
  addDaysISO,
  daysBetween,
  KIND_LABEL,
  type StaffTeam,
  type CountKey,
} from "@/lib/stats/staff-history";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const COUNT_LABELS: { key: CountKey; label: string }[] = [
  { key: "leads", label: "Leads" },
  { key: "converted", label: "Converted" },
  { key: "payments", label: "Sales" },
  { key: "profileEdits", label: "Profile edits" },
  { key: "profilesDone", label: "Profiles done" },
  { key: "sent", label: "Sent" },
  { key: "notes", label: "Notes" },
  { key: "calls", label: "Calls" },
  { key: "followups", label: "Follow-ups" },
  { key: "drafts", label: "Drafts started" },
  { key: "deleted", label: "Deleted" },
];

const TEAM_COUNTS: Record<StaffTeam, CountKey[]> = {
  sales: ["leads", "converted", "payments", "profileEdits", "profilesDone", "sent", "notes", "calls", "followups"],
  service: ["leads", "converted", "payments", "profileEdits", "profilesDone", "sent", "notes", "calls", "followups"],
  profile: ["profilesDone", "drafts", "profileEdits", "deleted"],
};

function fmtDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function ago(iso: string | null, nowMs: number) {
  if (!iso) return "No activity";
  const mins = Math.floor((nowMs - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

function pill(active: boolean) {
  return `rounded-full border px-3 py-1 text-sm ${
    active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
  }`;
}

export default async function StaffHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; from?: string; to?: string; employee?: string; day?: string }>;
}) {
  await requireRole("/dashboard/admin/staff-history");
  const sp = await searchParams;

  const team: StaffTeam =
    sp.team === "service" ? "service" : sp.team === "profile" ? "profile" : "sales";
  const today = istToday();
  let to = sp.to && DATE_RE.test(sp.to) ? sp.to : today;
  if (to > today) to = today;
  let from = sp.from && DATE_RE.test(sp.from) ? sp.from : addDaysISO(to, -6);
  if (from > to) [from, to] = [to, from];
  let clamped = false;
  if (daysBetween(from, to) > 365) {
    from = addDaysISO(to, -365);
    clamped = true;
  }
  const day = sp.day && DATE_RE.test(sp.day) && sp.day >= from && sp.day <= to ? sp.day : null;
  const wantsTimeline = !!sp.employee || !!day;

  const [history, timeline] = await Promise.all([
    getStaffHistory({ team, from, to }),
    wantsTimeline
      ? getStaffTimeline({ team, from, to, employeeId: sp.employee ?? null, day })
      : Promise.resolve(null),
  ]);

  const { summaries, days, cells, generatedAt } = history;
  const nowMs = new Date(generatedAt).getTime();
  const nameById = new Map(summaries.map((s) => [s.id, s.name]));
  const employeeId = timeline?.employeeId ?? null;

  const mk = (e: string | null, d: string | null, over?: { team?: StaffTeam; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    q.set("team", over?.team ?? team);
    q.set("from", over?.from ?? from);
    q.set("to", over?.to ?? to);
    if (e) q.set("employee", e);
    if (d) q.set("day", d);
    return `?${q.toString()}`;
  };

  const monthStart = `${today.slice(0, 8)}01`;
  const prevMonthEnd = addDaysISO(monthStart, -1);
  const presets = [
    { label: "Today", from: today, to: today },
    { label: "Yesterday", from: addDaysISO(today, -1), to: addDaysISO(today, -1) },
    { label: "Last 7 days", from: addDaysISO(today, -6), to: today },
    { label: "Last 30 days", from: addDaysISO(today, -29), to: today },
    { label: "This month", from: monthStart, to: today },
    { label: "Last month", from: `${prevMonthEnd.slice(0, 8)}01`, to: prevMonthEnd },
  ];

  const totalPoints = summaries.reduce((n, s) => n + s.points, 0);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Staff History"
        subtitle="What sales, service and profile staff did, for any dates you choose"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Link href={mk(null, null, { team: "sales" })} className={pill(team === "sales")}>
          Sales
        </Link>
        <Link href={mk(null, null, { team: "service" })} className={pill(team === "service")}>
          Service
        </Link>
        <Link href={mk(null, null, { team: "profile" })} className={pill(team === "profile")}>
          Profile team
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Link
              key={p.label}
              href={mk(null, null, { from: p.from, to: p.to })}
              className={pill(from === p.from && to === p.to)}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="team" value={team} />
          <label className="text-xs text-muted-foreground">
            From
            <input
              type="date"
              name="from"
              defaultValue={from}
              max={today}
              className="mt-1 block rounded-md border bg-background px-2 py-1 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            To
            <input
              type="date"
              name="to"
              defaultValue={to}
              max={today}
              className="mt-1 block rounded-md border bg-background px-2 py-1 text-sm text-foreground"
            />
          </label>
          <button type="submit" className="rounded-md border px-3 py-1 text-sm hover:bg-muted">
            Show
          </button>
        </form>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {from === to ? fmtDay(from) : `${fmtDay(from)} to ${fmtDay(to)}`} ({daysBetween(from, to) + 1} days),{" "}
        {summaries.length} staff, {totalPoints} points in total.
        {clamped && " The range was limited to one year."}
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaries.map((s, i) => (
          <div key={s.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={mk(s.id, null)}
                  className="text-base font-semibold underline-offset-2 hover:underline"
                >
                  {i + 1}. {s.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {s.role.replace(/_/g, " ")}
                  {s.isSME ? " · SME" : ""}
                  {!s.active ? " · inactive" : ""}
                </p>
                <p className="text-xs text-muted-foreground">Last active {ago(s.lastAt, nowMs)}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold tabular-nums">{s.points}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              {COUNT_LABELS.filter((c) => TEAM_COUNTS[team].includes(c.key)).map((c) => (
                <div key={c.key}>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="font-medium tabular-nums">{s.counts[c.key]}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
              <span>Active days: {s.activeDays}</span>
              <span>Avg per active day: {s.avgPerDay === null ? "-" : s.avgPerDay.toFixed(1)}</span>
              <span>
                Best day: {s.bestDay ? `${s.bestPoints} on ${fmtDay(s.bestDay).replace(/, \d{4}$/, "")}` : "-"}
              </span>
            </div>
          </div>
        ))}
        {summaries.length === 0 && (
          <p className="text-sm text-muted-foreground">No staff in this view.</p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Daily history (points)</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-3">Date</th>
                {summaries.map((s) => (
                  <th key={s.id} className="px-3 py-3 text-right">
                    {s.name}
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const row = cells[d] ?? {};
                const total = summaries.reduce((n, s) => n + (row[s.id]?.points ?? 0), 0);
                const selected = day === d;
                return (
                  <tr key={d} className={`border-b last:border-0 ${selected ? "bg-primary/10" : ""}`}>
                    <td className="px-3 py-2">
                      <Link
                        href={mk(employeeId, selected ? null : d)}
                        className="underline-offset-2 hover:underline"
                      >
                        {fmtDay(d)}
                      </Link>
                    </td>
                    {summaries.map((s) => {
                      const cell = row[s.id];
                      return (
                        <td key={s.id} className="px-3 py-2 text-right tabular-nums">
                          {cell ? (
                            <Link href={mk(s.id, d)} className="underline-offset-2 hover:underline">
                              <span className="font-semibold">{cell.points}</span>
                              <span className="ml-1 text-xs text-muted-foreground">({cell.actions})</span>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {total || <span className="font-normal text-muted-foreground">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Numbers in brackets are the number of actions. Click a person's name, a date, or a cell to see exactly
          what was done.
        </p>
      </div>

      {timeline && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              Activity timeline: {employeeId ? nameById.get(employeeId) ?? "Selected person" : "everyone"}
              {day ? ` on ${fmtDay(day)}` : ""} ({timeline.rows.length}
              {timeline.truncated ? "+" : ""})
            </h2>
            <Link href={mk(null, null)} className="rounded border px-2 py-0.5 text-xs hover:bg-muted">
              Clear
            </Link>
          </div>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-3">Time (IST)</th>
                  {!employeeId && <th className="px-3 py-3">Person</th>}
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Who / what</th>
                  <th className="px-3 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {timeline.rows.map((r, i) => (
                  <tr key={`${r.ts}-${i}`} className="border-b align-top last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{fmtTime(r.ts)}</td>
                    {!employeeId && <td className="px-3 py-2">{nameById.get(r.uid) ?? "Unknown"}</td>}
                    <td className="whitespace-nowrap px-3 py-2 text-xs">{KIND_LABEL[r.kind] ?? r.kind}</td>
                    <td className="px-3 py-2 font-medium">
                      {r.profileId ? (
                        <Link
                          href={`/dashboard/admin/profiles/${r.profileId}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {r.title}
                        </Link>
                      ) : (
                        r.title
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.detail}</td>
                  </tr>
                ))}
                {timeline.rows.length === 0 && (
                  <tr>
                    <td colSpan={employeeId ? 4 : 5} className="px-3 py-8 text-center text-muted-foreground">
                      Nothing recorded for this selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {timeline.truncated && (
            <p className="text-xs text-muted-foreground">
              Showing the latest 500. Click a single day, or pick one person, to see the rest.
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Points use the same weights as the Team Activity page. A lead call that was logged twice (as a remark and as a
        log entry) is counted once. Some actions were only recorded in the activity log from 8 Sep 2026, so older
        dates may look lighter. Drafts started and deletions are counted but earn no points. Days are IST.
      </p>
    </div>
  );
}
