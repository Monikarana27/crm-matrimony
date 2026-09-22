import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Funnel, HBars, Insight, Section, Stat, Table, type HRow, type Tone } from "@/components/analytics/kit";
import { PrintButton } from "@/components/analytics/print-button";
import {
  BUCKETS,
  DAY_MS,
  IST,
  NEVER,
  NO_SOURCE,
  SPEED,
  WEEKDAYS,
  bucketCounts,
  dateLabel,
  fmtDur,
  groupBy,
  isConv,
  isLost,
  isOpen,
  kindTotal,
  loadLeads,
  loadNames,
  median,
  n0,
  pageTypeOf,
  P,
  ps,
  speedLabel,
  type Bucket,
  type L,
} from "@/lib/analytics/lead-model";
import { PRESETS, addDays, daysBetween, groupKeys, keyLabel, keyOf, resolveRange, ymdStartMs, type Group } from "@/lib/analytics/report-range";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const KIND_TONE: Record<string, Tone> = { good: "good", open: "info", waste: "warn", junk: "bad", neutral: "muted" };

const SECTIONS: [string, string][] = [
  ["summary", "Summary and key findings"],
  ["table", "Day / week / month table"],
  ["funnel", "Lead funnel"],
  ["waste", "Why leads are wasted"],
  ["sources", "Source performance"],
  ["team", "Team and speed"],
  ["seo", "Website and SEO"],
  ["actions", "Action list"],
  ["notes", "Data notes"],
];

const agg = (ls: L[]) => ({
  n: ls.length,
  conv: ls.filter(isConv).length,
  lost: ls.filter(isLost).length,
  junk: ls.filter((l) => l.state === "WRONG_NUMBER" || l.state === "DUPLICATE").length,
  never: ls.filter((l) => l.touches === 0).length,
  web: ls.filter((l) => l.isWeb).length,
});

const arrow = (c: number, p: number) => (p === 0 ? (c === 0 ? "no change" : "new") : `${c >= p ? "▲" : "▼"} ${Math.abs(Math.round(((c - p) / p) * 100))}%`);

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 12mm; }
  aside, nav, header, footer, .no-print { display: none !important; }
  html, body { background: #fff !important; }
  main { margin: 0 !important; padding: 0 !important; max-width: none !important; }
  .keep { break-inside: avoid; }
}
.report-root { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`;

export default async function ReportPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const now = Date.now();

  const presetQ = one(sp.preset);
  const preset = PRESETS.some(([k]) => k === presetQ) ? (presetQ as string) : "30d";
  const { from, to } = resolveRange(preset, one(sp.from), one(sp.to), now);
  const days = daysBetween(from, to) + 1;
  const groupQ = one(sp.group);
  let group: Group = groupQ === "week" ? "week" : groupQ === "month" ? "month" : "day";
  if (group === "day" && days > 31) group = "week";
  const scope = one(sp.scope) === "website" ? "website" : "all";
  const submitted = !!one(sp.f);
  const compare = !submitted || one(sp.cmp) === "1";
  const rawS = sp.s;
  const sel = new Set<string>(Array.isArray(rawS) ? rawS : rawS ? [rawS] : []);
  const show = (k: string) => !submitted || sel.has(k);

  const data = await loadLeads();
  const pool = scope === "website" ? data.leads.filter((l) => l.isWeb) : data.leads;
  const startMs = ymdStartMs(from);
  const endMs = ymdStartMs(addDays(to, 1));
  const ls = pool.filter((l) => l.t >= startMs && l.t < endMs);
  const pFrom = addDays(from, -days);
  const pTo = addDays(from, -1);
  const prev = pool.filter((l) => l.t >= ymdStartMs(pFrom) && l.t < startMs);

  const a = agg(ls);
  const pa = agg(prev);
  const b = bucketCounts(ls);
  const n = ls.length;

  // ---------- Summary findings ----------
  const bySrc = Array.from(groupBy(ls, (l) => l.channel).entries())
    .map(([name, x]) => ({ name, ...agg(x), unreach: x.filter((l) => l.state === "NOT_REACHABLE").length }))
    .sort((x, y) => y.n - x.n);
  const findings: string[] = [];
  if (n === 0) findings.push("No leads arrived in this period.");
  else {
    findings.push(`${n0(n)} leads arrived${compare ? `, ${arrow(n, pa.n)} against the previous period (${n0(pa.n)}).` : "."}`);
    const best = bySrc.filter((s) => s.n >= 10 && s.name !== NO_SOURCE).sort((x, y) => y.conv / y.n - x.conv / x.n)[0];
    if (best && best.conv > 0) findings.push(`${best.name} converted best (${ps(best.conv, best.n)} of ${n0(best.n)} leads).`);
    const wasteKeys = (Object.keys(BUCKETS) as Bucket[]).filter((k) => ["waste", "junk"].includes(BUCKETS[k].kind));
    const topW = wasteKeys.map((k) => ({ k, v: b[k] })).sort((x, y) => y.v - x.v)[0];
    if (topW && topW.v > 0) findings.push(`Biggest loss reason: ${BUCKETS[topW.k].label} (${n0(topW.v)}, ${ps(topW.v, n)} of leads).`);
    if (a.never > 0) findings.push(`${n0(a.never)} leads (${ps(a.never, n)}) were never contacted.`);
    if (a.junk / n > 0.05) findings.push(`${ps(a.junk, n)} of leads were wrong numbers or duplicates. Ask paid portals for credits and validate phone numbers on the website form.`);
    if (a.web > 0) findings.push(`${n0(a.web)} leads (${ps(a.web, n)}) came through the website form.`);
  }

  // ---------- Period table ----------
  const byKey = groupBy(ls, (l) => keyOf(l.ymd, group));
  const keys = groupKeys(from, to, group);
  const periodRows = keys.map((k) => {
    const x = agg(byKey.get(k) ?? []);
    return [keyLabel(k, group), n0(x.n), n0(x.conv), n0(x.lost), n0(x.junk), n0(x.never), n0(x.web)];
  });
  periodRows.push(["Total", n0(a.n), n0(a.conv), n0(a.lost), n0(a.junk), n0(a.never), n0(a.web)]);

  // ---------- Funnel ----------
  const contacted = ls.filter((l) => l.touches > 0 || isConv(l)).length;
  const spoke = ls.filter((l) => (l.touches > 0 || isConv(l)) && l.state !== "NOT_REACHABLE" && l.state !== "WRONG_NUMBER" && l.state !== "DUPLICATE").length;

  // ---------- Waste ----------
  const wasteRows: HRow[] = (Object.keys(BUCKETS) as Bucket[])
    .filter((k) => ["waste", "junk"].includes(BUCKETS[k].kind))
    .map((k) => ({ label: BUCKETS[k].label, value: b[k], text: `${n0(b[k])} (${ps(b[k], n)})`, tone: KIND_TONE[BUCKETS[k].kind] }))
    .sort((x, y) => y.value - x.value);

  // ---------- Team ----------
  let teamRows: (string | number)[][] = [];
  let speedRows: string[][] = [];
  if (show("team")) {
    const ids = Array.from(new Set(ls.map((l) => l.assignee).filter((x): x is string => !!x)));
    const names = await loadNames(ids);
    teamRows = Array.from(groupBy(ls, (l) => l.assignee ?? "__none").entries())
      .map(([id, x]) => {
        const r = agg(x);
        const first = median(x.filter((l) => l.firstTouchMs !== null).map((l) => l.firstTouchMs as number));
        return {
          r,
          row: [
            id === "__none" ? "Unassigned" : names.get(id) ?? `Staff ...${id.slice(-4)}`,
            n0(r.n),
            ps(x.filter((l) => l.touches > 0 || isConv(l)).length, r.n),
            ps(r.conv, r.n),
            ps(r.lost, r.n),
            fmtDur(first),
          ],
        };
      })
      .sort((x, y) => y.r.n - x.r.n)
      .map((x) => x.row);
    const sp2 = groupBy(ls, (l) => speedLabel(l.firstTouchMs));
    speedRows = [...SPEED.map((s) => s.label), NEVER].map((k) => {
      const x = sp2.get(k) ?? [];
      return [k, n0(x.length), ps(x.filter(isConv).length, x.length), ps(x.filter(isLost).length, x.length)];
    });
  }

  // ---------- SEO ----------
  const web = ls.filter((l) => l.isWeb);
  const tagged = web.filter((l) => l.page);
  const byPage = Array.from(groupBy(web, (l) => l.page ?? "(page not recorded)").entries())
    .map(([name, x]) => ({ name, ...agg(x) }))
    .sort((x, y) => y.n - x.n)
    .slice(0, 15);
  const byType = Array.from(groupBy(tagged, (l) => pageTypeOf(l.page)).entries())
    .map(([name, x]) => ({ name, ...agg(x) }))
    .sort((x, y) => y.n - x.n);
  const hours = Array(24).fill(0) as number[];
  const wds = Array(7).fill(0) as number[];
  for (const l of web) {
    hours[l.hour] = (hours[l.hour] ?? 0) + 1;
    wds[l.wd] = (wds[l.wd] ?? 0) + 1;
  }
  let ev: { channel: string; c: number }[] = [];
  let evPages: { page: string; c: number }[] = [];
  if (show("seo")) {
    try {
      ev = await prisma.$queryRaw<{ channel: string; c: number }[]>`SELECT channel, COUNT(*)::int AS c FROM enquiry_events WHERE "createdAt" >= ${new Date(startMs)} AND "createdAt" < ${new Date(endMs)} GROUP BY 1 ORDER BY 2 DESC`;
      evPages = await prisma.$queryRaw<{ page: string; c: number }[]>`SELECT COALESCE("landingPath","pagePath",'(unknown)') AS page, COUNT(*)::int AS c FROM enquiry_events WHERE "createdAt" >= ${new Date(startMs)} AND "createdAt" < ${new Date(endMs)} GROUP BY 1 ORDER BY 2 DESC LIMIT 10`;
    } catch {
      /* table missing or empty: skip the tracking block */
    }
  }

  // ---------- Actions (as of today, whole pool) ----------
  const stale = (d: number) => pool.filter((l) => isOpen(l) && now - l.lastTouch > d * DAY_MS).length;
  const reactivate = pool.filter((l) => (l.state === "NOT_INTERESTED" || l.state === "NOT_REACHABLE") && l.phoneOk && now - l.lastTouch > 60 * DAY_MS).length;
  const early = ls.filter((l) => (l.state === "NOT_INTERESTED" || l.state === "NOT_REACHABLE") && l.touches <= 1).length;

  const cmpSub = (cur: number, p: number, fmt: (v: number) => string) => (compare ? `previous ${fmt(p)} (${arrow(cur, p)})` : undefined);
  const generated = new Date(now).toLocaleString("en-IN", { timeZone: IST, dateStyle: "medium", timeStyle: "short" });
  const rangeText = `${dateLabel(startMs)} to ${dateLabel(endMs - 1)}`;

  return (
    <div className="report-root space-y-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="no-print">
        <Link
          href="/dashboard/admin/lead-analytics"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to analytics
        </Link>
      </div>

      <form method="get" className="no-print space-y-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <input type="hidden" name="f" value="1" />
        <div className="flex flex-wrap items-end gap-4 text-xs">
          <label className="space-y-1">
            <span className="block text-muted-foreground">Period</span>
            <select name="preset" defaultValue={preset} className="rounded-md border bg-background px-2 py-1.5 text-sm">
              {PRESETS.map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-muted-foreground">From (custom)</span>
            <input type="date" name="from" defaultValue={from} className="rounded-md border bg-background px-2 py-1.5 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="block text-muted-foreground">To (custom)</span>
            <input type="date" name="to" defaultValue={to} className="rounded-md border bg-background px-2 py-1.5 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="block text-muted-foreground">Group by</span>
            <select name="group" defaultValue={group} className="rounded-md border bg-background px-2 py-1.5 text-sm">
              <option value="day">Day-wise (up to 31 days)</option>
              <option value="week">Week-wise</option>
              <option value="month">Month-wise</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-muted-foreground">Leads</span>
            <select name="scope" defaultValue={scope} className="rounded-md border bg-background px-2 py-1.5 text-sm">
              <option value="all">All leads</option>
              <option value="website">Website only</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <input type="checkbox" name="cmp" value="1" defaultChecked={compare} /> Compare with previous period
          </label>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Include:</span>
          {SECTIONS.map(([k, l]) => (
            <label key={k} className="flex items-center gap-1.5">
              <input type="checkbox" name="s" value={k} defaultChecked={show(k)} /> {l}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-full border bg-background px-4 py-1.5 text-xs font-medium hover:bg-muted">
            Update report
          </button>
          <PrintButton />
          <span className="text-xs text-muted-foreground">In the print dialog choose "Save as PDF", paper A4, and switch on "Background graphics".</span>
        </div>
      </form>

      <div className="keep">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Elite Bandhan CRM</p>
        <h1 className="text-2xl font-semibold">Lead Report</h1>
        <p className="text-sm text-muted-foreground">
          {rangeText} ({days} day{days === 1 ? "" : "s"}) · {scope === "website" ? "Website leads only" : "All leads"} · Generated {generated} IST
        </p>
      </div>

      {show("summary") && (
        <div className="keep space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Leads received" value={n0(a.n)} sub={cmpSub(a.n, pa.n, n0)} />
            <Stat label="Converted" value={n0(a.conv)} sub={compare ? `${ps(a.conv, a.n)} of leads · previous ${ps(pa.conv, pa.n)}` : `${ps(a.conv, a.n)} of leads`} tone="good" />
            <Stat label="Wasted" value={ps(a.lost, a.n)} sub={compare ? `${n0(a.lost)} leads · previous ${ps(pa.lost, pa.n)}` : `${n0(a.lost)} leads`} tone="bad" />
            <Stat label="Never contacted" value={n0(a.never)} sub={cmpSub(a.never, pa.never, n0)} tone={a.never > 0 ? "warn" : "good"} />
          </div>
          <Section title="Key findings" why="Plain-English points from this period's data.">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {findings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {show("table") && (
        <div className="keep">
          <Section title={`${group === "day" ? "Day-wise" : group === "week" ? "Week-wise" : "Month-wise"} breakdown`} why="Leads arriving in each period and what happened to them. Bad numbers = wrong numbers plus duplicates.">
            <Table
              cols={[{ h: "Period" }, { h: "Leads", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }, { h: "Bad numbers", right: true }, { h: "Never contacted", right: true }, { h: "Website", right: true }]}
              rows={periodRows}
            />
          </Section>
        </div>
      )}

      {show("funnel") && (
        <div className="keep">
          <Section title="Lead funnel" why="Where leads drop off between arriving and converting.">
            <Funnel
              steps={[
                { label: "Received", value: n },
                { label: "Contacted at least once", value: contacted },
                { label: "Reached a real person", value: spoke },
                { label: "Converted", value: a.conv },
              ]}
            />
            <p className="mt-3 text-xs text-muted-foreground">Still open: {n0(kindTotal(b, ["open", "neutral"]))}.</p>
          </Section>
        </div>
      )}

      {show("waste") && (
        <div className="keep">
          <Section title="Why leads are wasted" why="Share of this period's leads lost, by reason.">
            <HBars rows={wasteRows} max={Math.max(n, 1)} />
            <p className="mt-3 text-xs text-muted-foreground">Given up after 0 or 1 attempt: {n0(early)} leads (worth a second try).</p>
          </Section>
        </div>
      )}

      {show("sources") && (
        <div className="keep">
          <Section title="Source performance" why="Compare channels before spending more on any of them.">
            <Table
              cols={[{ h: "Source" }, { h: "Leads", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }, { h: "Bad data", right: true }, { h: "Unreachable", right: true }, { h: "Never called", right: true }]}
              rows={bySrc.map((s) => [s.name, n0(s.n), ps(s.conv, s.n), ps(s.lost, s.n), ps(s.junk, s.n), ps(s.unreach, s.n), n0(s.never)])}
              empty="No leads in this period."
            />
          </Section>
        </div>
      )}

      {show("team") && (
        <div className="keep space-y-4">
          <Section title="Team performance" why="Per assignee, for leads that arrived in this period.">
            <Table
              cols={[{ h: "Staff" }, { h: "Leads", right: true }, { h: "Contacted", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }, { h: "Median 1st call", right: true }]}
              rows={teamRows}
              empty="No leads in this period."
            />
          </Section>
          <Section title="Does calling faster help?" why="Conversion by time until the first logged call.">
            <Table cols={[{ h: "First call" }, { h: "Leads", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }]} rows={speedRows} />
          </Section>
        </div>
      )}

      {show("seo") && (
        <div className="space-y-4">
          <div className="keep">
            <Section title="Website and SEO" why="Website form leads in this period.">
              <p className="mb-3 text-sm">
                {n0(web.length)} website leads · {n0(tagged.length)} with a page recorded
                {web.length >= 5 ? ` · busiest weekday ${WEEKDAYS[wds.indexOf(Math.max(...wds))]}, peak hour ${hours.indexOf(Math.max(...hours))}:00` : ""}
              </p>
              <Table
                cols={[{ h: "Page" }, { h: "Leads", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }]}
                rows={byPage.map((p) => [p.name, n0(p.n), ps(p.conv, p.n), ps(p.lost, p.n)])}
                empty="No website leads in this period."
              />
            </Section>
          </div>
          {byType.length > 0 && (
            <div className="keep">
              <Section title="Page type performance" why="City, community and niche pages compared.">
                <Table cols={[{ h: "Page type" }, { h: "Leads", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }]} rows={byType.map((t) => [t.name, n0(t.n), ps(t.conv, t.n), ps(t.lost, t.n)])} />
              </Section>
            </div>
          )}
          {ev.length > 0 && (
            <div className="keep">
              <Section title="Traffic channels (from enquiry tracking)" why="Organic search vs ads vs social vs direct, for enquiries the website has tracked.">
                <Table cols={[{ h: "Channel" }, { h: "Enquiries", right: true }]} rows={ev.map((e) => [e.channel, n0(e.c)])} />
                {evPages.length > 0 && (
                  <div className="mt-4">
                    <Table cols={[{ h: "Landing page" }, { h: "Enquiries", right: true }]} rows={evPages.map((e) => [e.page, n0(e.c)])} />
                  </div>
                )}
              </Section>
            </div>
          )}
        </div>
      )}

      {show("actions") && (
        <div className="keep">
          <Section title="Action list" why="As of today, across all the leads in scope (not only this period).">
            <Table
              cols={[{ h: "Action" }, { h: "Leads", right: true }]}
              rows={[
                ["Open leads untouched for 7+ days", n0(stale(7))],
                ["Open leads untouched for 14+ days", n0(stale(14))],
                ["Open leads untouched for 30+ days", n0(stale(30))],
                ["Reactivation pool (said no or unreachable 60+ days ago, valid number)", n0(reactivate)],
              ]}
            />
          </Section>
        </div>
      )}

      {show("notes") && (
        <div className="keep space-y-3">
          <Section title="Data notes" why="Read these before drawing conclusions.">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>{n0(ls.filter((l) => l.channel === NO_SOURCE).length)} leads in this period have no source recorded.</li>
              <li>{n0(ls.filter((l) => !l.phoneOk).length)} leads have an invalid-looking phone number; {n0(ls.filter((l) => l.dupPhone).length)} share a number with another lead.</li>
              <li>{n0(b.OTHER)} leads have a status the analytics could not classify (see the Data quality tab).</li>
              <li>For phone, WhatsApp and portal leads the arrival date is when your team logged the lead. Only website leads carry the real customer time.</li>
              <li>Outcomes are each lead's status today, so recent leads look less converted because many are still open.</li>
            </ul>
          </Section>
          <Insight tone="muted" title="Privacy">This report contains totals and percentages only, with no customer names or phone numbers.</Insight>
        </div>
      )}
    </div>
  );
}
