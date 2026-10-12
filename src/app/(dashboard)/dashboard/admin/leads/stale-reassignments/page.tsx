import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardHero } from "@/components/layout/dashboard-hero";

function fmt(d: Date | null) {
  return d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "-";
}
function fmtDay(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" }) : "-";
}
function label(s: string) {
  const t = s.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function Stat({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export default async function StaleReassignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const session = await auth();
  const role = session!.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/dashboard");

  const { run } = await searchParams;

  const runs = await prisma.staleReassignmentRun.findMany({ orderBy: { startedAt: "desc" }, take: 30 });
  const selected = runs.find((r) => r.id === run) ?? runs[0] ?? null;

  const movedItems = selected
    ? await prisma.staleReassignmentItem.findMany({
        where: { runId: selected.id, outcome: "REASSIGNED" },
        orderBy: [{ idleDays: "desc" }],
      })
    : [];
  const waiting = selected
    ? await prisma.staleReassignmentItem.findMany({
        where: { runId: selected.id, outcome: "NOT_PROCESSED_CAP" },
        orderBy: [{ idleDays: "desc" }],
        take: 50,
      })
    : [];

  const movedIds = movedItems.map((i) => i.leadId);
  const leadNow = movedIds.length
    ? await prisma.lead.findMany({ where: { id: { in: movedIds } }, select: { id: true, status: true } })
    : [];
  const remarks =
    movedIds.length && selected
      ? await prisma.leadRemark.findMany({
          where: { leadId: { in: movedIds }, createdAt: { gte: selected.startedAt } },
          orderBy: { createdAt: "desc" },
          select: { leadId: true, createdAt: true, followUpDate: true },
        })
      : [];

  const nowOf = new Map(leadNow.map((l) => [l.id, String(l.status)]));
  const remarksOf = new Map<string, { count: number; last: Date; followUp: Date | null }>();
  for (const r of remarks) {
    const cur = remarksOf.get(r.leadId);
    if (!cur) remarksOf.set(r.leadId, { count: 1, last: r.createdAt, followUp: r.followUpDate });
    else {
      cur.count++;
      if (!cur.followUp && r.followUpDate) cur.followUp = r.followUpDate;
    }
  }

  const rows = movedItems.map((i) => {
    const now = nowOf.get(i.leadId) ?? "?";
    return { item: i, now, changed: now !== i.leadStatus, rem: remarksOf.get(i.leadId) ?? null };
  });
  const moved = rows.length;
  const worked = rows.filter((r) => r.rem).length;
  const withFollowUp = rows.filter((r) => r.rem?.followUp).length;
  const changedCount = rows.filter((r) => r.changed).length;
  const pct = (n: number) => (moved ? `${Math.round((n / moved) * 100)}%` : "-");
  const statusCounts: Record<string, number> = {};
  for (const r of rows) statusCounts[r.now] = (statusCounts[r.now] ?? 0) + 1;

  const ids = Array.from(
    new Set([...movedItems, ...waiting].flatMap((i) => [i.fromEmployeeId, i.toEmployeeId]).filter((x): x is string => !!x))
  );
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
  const nameOf = (id: string | null) => (id ? users.find((u) => u.id === id)?.name ?? "?" : "-");

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Stale Lead Reassignments"
        subtitle="Every automatic run: what moved, who got it, and whether anyone has worked it since."
      />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Run (IST)</th>
              <th className="p-2">Stale found</th>
              <th className="p-2">Moved</th>
              <th className="p-2">Waiting for cap</th>
              <th className="p-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr><td className="p-3 text-muted-foreground" colSpan={5}>No tracked runs yet.</td></tr>
            )}
            {runs.map((r) => (
              <tr key={r.id} className={r.id === selected?.id ? "bg-muted/40" : ""}>
                <td className="p-2"><Link className="underline" href={`?run=${r.id}`}>{fmt(r.startedAt)}</Link></td>
                <td className="p-2">{r.staleFound}</td>
                <td className="p-2">{r.reassigned}</td>
                <td className="p-2">{r.notProcessed}</td>
                <td className="p-2">{r.error ? "Failed" : r.finishedAt ? (r.stoppedAtCap ? "Stopped at daily cap" : "Complete") : "Incomplete"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="space-y-4">
          <h3 className="font-semibold">Run of {fmt(selected.startedAt)}</h3>
          {selected.error && <p className="text-sm text-red-600">Error: {selected.error}</p>}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat title="Leads moved" value={String(moved)} />
            <Stat title="Worked on since the move" value={`${worked}`} note={`${pct(worked)} have a remark from the new owner`} />
            <Stat title="Follow-up set by new owner" value={`${withFollowUp}`} note={pct(withFollowUp)} />
            <Stat title="Status changed" value={`${changedCount}`} note={pct(changedCount)} />
          </div>
          {moved > 0 && (
            <p className="text-sm text-muted-foreground">
              Status now: {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([st, n]) => `${label(st)} ${n}`).join(" · ")}
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2">Lead</th>
                  <th className="p-2">Idle days</th>
                  <th className="p-2">Moved from → to</th>
                  <th className="p-2">Status at move</th>
                  <th className="p-2">Status now</th>
                  <th className="p-2">Worked since?</th>
                  <th className="p-2">New follow-up</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td className="p-3 text-muted-foreground" colSpan={7}>No leads were moved in this run.</td></tr>
                )}
                {rows.map(({ item: i, now, changed, rem }) => (
                  <tr key={i.id}>
                    <td className="p-2"><Link className="underline" href={`/dashboard/admin/leads/${i.leadId}`}>{i.leadName}</Link></td>
                    <td className="p-2">{i.idleDays}</td>
                    <td className="p-2">{nameOf(i.fromEmployeeId)} → {nameOf(i.toEmployeeId)}</td>
                    <td className="p-2">{label(i.leadStatus)}</td>
                    <td className="p-2">{changed ? <strong>{label(now)}</strong> : label(now)}</td>
                    <td className="p-2">{rem ? `Yes (${rem.count}, last ${fmtDay(rem.last)})` : "No"}</td>
                    <td className="p-2">{rem?.followUp ? fmtDay(rem.followUp) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected.skippedSame > 0 && (
            <p className="text-sm text-muted-foreground">
              {selected.skippedSame} lead(s) skipped because the rotation landed on their current owner.
            </p>
          )}

          {selected.notProcessed > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Still waiting for the daily cap</h4>
              <p className="text-sm text-muted-foreground">
                Showing the {waiting.length} longest-idle of {selected.notProcessed}. They are picked up in later runs.
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-2">Lead</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Idle days</th>
                      <th className="p-2">Currently with</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waiting.map((i) => (
                      <tr key={i.id}>
                        <td className="p-2"><Link className="underline" href={`/dashboard/admin/leads/${i.leadId}`}>{i.leadName}</Link></td>
                        <td className="p-2">{label(i.leadStatus)}</td>
                        <td className="p-2">{i.idleDays}</td>
                        <td className="p-2">{nameOf(i.fromEmployeeId)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
