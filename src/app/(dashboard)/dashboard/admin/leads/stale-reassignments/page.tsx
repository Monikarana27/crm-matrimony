import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardHero } from "@/components/layout/dashboard-hero";

const OUTCOME_LABEL: Record<string, string> = {
  REASSIGNED: "Reassigned",
  SKIPPED_SAME_ASSIGNEE: "Skipped (same assignee)",
  NOT_PROCESSED_CAP: "Not processed (daily cap)",
};

function fmt(d: Date | null) {
  return d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "-";
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

  const runs = await prisma.staleReassignmentRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 30,
  });
  const selected = runs.find((r) => r.id === run) ?? runs[0] ?? null;

  const moved = selected
    ? await prisma.staleReassignmentItem.findMany({
        where: { runId: selected.id, outcome: { not: "NOT_PROCESSED_CAP" } },
        orderBy: [{ outcome: "asc" }, { leadName: "asc" }],
      })
    : [];
  const waiting = selected
    ? await prisma.staleReassignmentItem.findMany({
        where: { runId: selected.id, outcome: "NOT_PROCESSED_CAP" },
        orderBy: [{ idleDays: "desc" }],
        take: 50,
      })
    : [];
  const items = [...moved, ...waiting];

  const ids = Array.from(
    new Set(items.flatMap((i) => [i.fromEmployeeId, i.toEmployeeId]).filter((x): x is string => !!x))
  );
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const nameOf = (id: string | null) => (id ? users.find((u) => u.id === id)?.name ?? "?" : "-");

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Stale Lead Reassignments"
        subtitle="Every automatic reassignment run: what moved, to whom, and what was left behind."
      />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Run (IST)</th>
              <th className="p-2">Stale found</th>
              <th className="p-2">Reassigned</th>
              <th className="p-2">Same assignee</th>
              <th className="p-2">Not processed</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr><td className="p-3 text-muted-foreground" colSpan={6}>No tracked runs yet. The first one is recorded at the next 10:30 UTC cron.</td></tr>
            )}
            {runs.map((r) => (
              <tr key={r.id} className={r.id === selected?.id ? "bg-muted/40" : ""}>
                <td className="p-2">
                  <Link className="underline" href={`?run=${r.id}`}>{fmt(r.startedAt)}</Link>
                </td>
                <td className="p-2">{r.staleFound}</td>
                <td className="p-2">{r.reassigned}</td>
                <td className="p-2">{r.skippedSame}</td>
                <td className="p-2">{r.notProcessed}</td>
                <td className="p-2">
                  {r.error ? "Failed" : r.finishedAt ? (r.stoppedAtCap ? "Stopped at cap" : "Complete") : "Incomplete"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="space-y-2">
          <h3 className="font-semibold">Run of {fmt(selected.startedAt)}</h3>
          {selected.error && <p className="text-sm text-red-600">Error: {selected.error}</p>}
          {selected.notProcessed > 0 && (
            <p className="text-sm text-muted-foreground">
              Moved leads are listed first. Showing the {waiting.length} longest-idle of {selected.notProcessed} leads still waiting for the daily cap.
            </p>
          )}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2">Lead</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Idle days</th>
                  <th className="p-2">From</th>
                  <th className="p-2">To</th>
                  <th className="p-2">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="p-2"><Link className="underline" href={`/dashboard/admin/leads/${i.leadId}`}>{i.leadName}</Link></td>
                    <td className="p-2">{i.leadStatus}</td>
                    <td className="p-2">{i.idleDays}</td>
                    <td className="p-2">{nameOf(i.fromEmployeeId)}</td>
                    <td className="p-2">{nameOf(i.toEmployeeId)}</td>
                    <td className="p-2">{OUTCOME_LABEL[i.outcome] ?? i.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
