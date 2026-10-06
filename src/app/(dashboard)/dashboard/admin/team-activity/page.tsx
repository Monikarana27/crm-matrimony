import Link from "next/link";
import { requireRole } from "@/lib/permissions/guard";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import {
  getTeamActivity,
  WEIGHTS,
  type RangeKey,
  type TeamKey,
  type CountKey,
} from "@/lib/stats/team-activity";
import { LiveRefresh } from "./live-refresh";

export const dynamic = "force-dynamic";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];

const TEAMS: { key: TeamKey; label: string }[] = [
  { key: "all", label: "All staff" },
  { key: "sales", label: "Sales" },
  { key: "service", label: "Service" },
  { key: "profile", label: "Profile team" },
];

const COLUMNS: { key: CountKey; label: string; title: string }[] = [
  { key: "leadTouches", label: "Leads", title: "Lead remarks and lead updates" },
  { key: "converted", label: "Converted", title: "Leads marked converted" },
  { key: "profilesDone", label: "Profiles done", title: "Profiles completed" },
  { key: "profileEdits", label: "Profile edits", title: "Profile updates" },
  { key: "sent", label: "Sent", title: "Profiles sent to clients or prospects" },
  { key: "notes", label: "Notes", title: "Profile remarks and service comments" },
  { key: "calls", label: "Calls", title: "Call logs and welcome calls" },
  { key: "followups", label: "Follow-ups", title: "SME follow-ups marked done" },
  { key: "payments", label: "Sales", title: "Paid payments credited to the person" },
];

const STATE_LABEL = { working: "Working", break: "On break", offline: "Not clocked in" } as const;
const STATE_DOT = {
  working: "bg-emerald-500",
  break: "bg-amber-500",
  offline: "bg-zinc-400",
} as const;

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

export default async function TeamActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; team?: string }>;
}) {
  await requireRole("/dashboard/admin/team-activity");
  const sp = await searchParams;
  const range: RangeKey = sp.range === "7d" || sp.range === "30d" ? sp.range : "today";
  const team: TeamKey =
    sp.team === "sales" || sp.team === "service" || sp.team === "profile" ? sp.team : "all";

  const { rows, generatedAt } = await getTeamActivity({ range, team });
  const nowMs = new Date(generatedAt).getTime();

  const totalPoints = rows.reduce((n, r) => n + r.score, 0);
  const workingNow = rows.filter((r) => r.state === "working").length;
  const onBreak = rows.filter((r) => r.state === "break").length;
  const top = rows[0] && rows[0].score > 0 ? rows[0] : null;

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Team Activity"
        subtitle="Who is doing the most work, ranked by points and updated live"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <Link key={r.key} href={`?range=${r.key}&team=${team}`} className={pill(range === r.key)}>
              {r.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {TEAMS.map((t) => (
            <Link key={t.key} href={`?range=${range}&team=${t.key}`} className={pill(team === t.key)}>
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <LiveRefresh generatedAt={generatedAt} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Top performer</p>
          <p className="mt-1 text-lg font-semibold">{top ? top.name : "No activity yet"}</p>
          {top && <p className="text-xs text-muted-foreground">{top.score} points</p>}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Working right now</p>
          <p className="mt-1 text-lg font-semibold">{workingNow}</p>
          <p className="text-xs text-muted-foreground">{onBreak} on break</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total points ({RANGES.find((r) => r.key === range)?.label})</p>
          <p className="mt-1 text-lg font-semibold">{totalPoints}</p>
          <p className="text-xs text-muted-foreground">{rows.length} staff shown</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Points</th>
              {COLUMNS.map((c) => (
                <th key={c.key} title={c.title} className="px-3 py-3 text-right">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-3 text-right" title="Clocked-in hours, breaks excluded">
                Hours
              </th>
              <th className="px-3 py-3 text-right">Pts/hr</th>
              <th className="px-3 py-3">Last active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={`border-b last:border-0 ${i === 0 && r.score > 0 ? "bg-amber-500/10" : ""}`}>
                <td className="px-3 py-2.5 font-medium">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.role.replace(/_/g, " ")}
                    {r.isSME ? " · SME" : ""}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span className={`h-2 w-2 rounded-full ${STATE_DOT[r.state]}`} />
                    {STATE_LABEL[r.state]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-base font-semibold">{r.score}</td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="px-3 py-2.5 text-right tabular-nums">
                    {r[c.key] || <span className="text-muted-foreground">0</span>}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right tabular-nums">{r.hours.toFixed(1)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {r.perHour === null ? "-" : r.perHour.toFixed(1)}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{ago(r.lastAt, nowMs)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 7} className="px-3 py-8 text-center text-muted-foreground">
                  No staff in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Points: lead remark {WEIGHTS.leadRemark}, lead update {WEIGHTS.leadUpdate}, conversion +{WEIGHTS.converted},
        profile completed {WEIGHTS.profileDone}, profile edit {WEIGHTS.profileEdit}, profiles sent {WEIGHTS.sent},
        note {WEIGHTS.note}, call {WEIGHTS.call}, follow-up done {WEIGHTS.followup}, sale {WEIGHTS.payment}.
        Hours are clocked-in time without breaks; a missing check-out on a past day counts as zero. Points per hour
        shows once someone has at least half an hour clocked in. Status reflects today, whichever range is selected.
      </p>
    </div>
  );
}
