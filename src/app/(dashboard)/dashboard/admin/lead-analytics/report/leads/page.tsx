import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { loadLeads, isConv, isLost } from "@/lib/analytics/lead-model";
import { addDays, ymdStartMs } from "@/lib/analytics/report-range";

const KINDS: Record<string, { title: string; note: string }> = {
  received: { title: "Leads received", note: "Every lead created in the period." },
  converted: { title: "Converted leads", note: "Leads whose status is Converted." },
  wasted: { title: "Wasted leads", note: "Not interested / lost, plus wrong numbers and duplicates." },
  never: { title: "Never contacted leads", note: "Leads with no call or remark logged and no edits by sales or service staff." },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const YMD = /^\d{4}-\d{2}-\d{2}$/;

function fmt(ms: number) {
  return new Date(ms).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}
function label(s: string) {
  const t = s.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default async function ReportLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const role = session!.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const kind = one(sp.kind) in KINDS ? one(sp.kind) : "received";
  const from = one(sp.from);
  const to = one(sp.to);
  const scope = one(sp.scope) === "website" ? "website" : "all";
  if (!YMD.test(from) || !YMD.test(to)) redirect("/dashboard/admin/lead-analytics");

  const data = await loadLeads();
  const pool = scope === "website" ? data.leads.filter((l) => l.isWeb) : data.leads;
  const startMs = ymdStartMs(from);
  const endMs = ymdStartMs(addDays(to, 1));
  const inPeriod = pool.filter((l) => l.t >= startMs && l.t < endMs);
  const picked = inPeriod.filter((l) =>
    kind === "converted" ? isConv(l) : kind === "wasted" ? isLost(l) : kind === "never" ? l.touches === 0 && !l.edited : true
  );
  const sorted = [...picked].sort((a, b) => b.t - a.t);
  const CAP = 500;
  const shown = sorted.slice(0, CAP);

  const details = shown.length
    ? await prisma.lead.findMany({
        where: { id: { in: shown.map((l) => l.id) } },
        select: { id: true, name: true, phone: true, source: true, status: true, assignedTo: { select: { name: true } } },
      })
    : [];
  const byId = new Map(details.map((d) => [d.id, d]));

  const back = `/dashboard/admin/lead-analytics/report?f=1&from=${from}&to=${to}&scope=${scope}&cmp=1`;

  return (
    <div className="space-y-4">
      <DashboardHero
        title={KINDS[kind].title}
        subtitle={`${from} to ${to} · ${scope === "website" ? "Website leads only" : "All leads"} · ${picked.length} lead(s)`}
      />
      <p className="text-sm text-muted-foreground">
        {KINDS[kind].note} <Link className="underline" href={back}>Back to the report</Link>
        {picked.length > CAP && ` · Showing the newest ${CAP} of ${picked.length}.`}
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Lead</th>
              <th className="p-2">Phone</th>
              <th className="p-2">Source</th>
              <th className="p-2">Status</th>
              <th className="p-2">Assigned to</th>
              <th className="p-2">Created (IST)</th>
              <th className="p-2">Team touches</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td className="p-3 text-muted-foreground" colSpan={7}>No leads match.</td></tr>
            )}
            {shown.map((l) => {
              const d = byId.get(l.id);
              return (
                <tr key={l.id}>
                  <td className="p-2"><Link className="underline" href={`/dashboard/admin/leads/${l.id}`}>{d?.name ?? l.id}</Link></td>
                  <td className="p-2">{d?.phone ?? "-"}</td>
                  <td className="p-2">{d?.source ?? l.channel}</td>
                  <td className="p-2">{label(String(d?.status ?? l.status))}</td>
                  <td className="p-2">{d?.assignedTo?.name ?? "Unassigned"}</td>
                  <td className="p-2">{fmt(l.t)}</td>
                  <td className="p-2">{l.touches}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
