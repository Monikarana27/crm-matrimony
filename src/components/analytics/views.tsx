import {
  BUCKETS,
  DAY_MS,
  NEVER,
  NO_SOURCE,
  SPEED,
  WEEKDAYS,
  bucketCounts,
  classify,
  dateLabel,
  fmtDur,
  groupBy,
  isConv,
  isLost,
  isOpen,
  kindTotal,
  lastDays,
  lastMonths,
  median,
  n0,
  pageTypeOf,
  P,
  ps,
  speedLabel,
  type Bucket,
  type L,
} from "@/lib/analytics/lead-model";
import { Badge, Funnel, HBars, Insight, Section, Stat, Table, VBars, type HRow, type Tone } from "./kit";
import type { TrafficEvent } from "@/lib/analytics/enquiry-events";

type VP = { ls: L[]; now: number };
const KIND_TONE: Record<string, Tone> = { good: "good", open: "info", waste: "warn", junk: "bad", neutral: "muted" };
const grid4 = "grid grid-cols-2 gap-4 lg:grid-cols-4";
const grid3 = "grid grid-cols-1 gap-4 lg:grid-cols-3";
const rel = (p: number, base: number, higherIsBad: boolean): Tone => {
  const d = higherIsBad ? p - base : base - p;
  return d >= 10 ? "bad" : d <= -10 ? "good" : "muted";
};
const rates = (ls: L[]) => ({
  n: ls.length,
  conv: ls.filter(isConv).length,
  lost: ls.filter(isLost).length,
  junk: ls.filter((l) => l.state === "WRONG_NUMBER" || l.state === "DUPLICATE").length,
  never: ls.filter((l) => l.touches === 0).length,
});

// ================= OVERVIEW =================
function buildInsights(ls: L[]) {
  const out: { tone: Tone; title: string; body: string }[] = [];
  const n = ls.length;
  if (n < 30) return [{ tone: "info" as Tone, title: "Too few leads here to draw firm conclusions", body: "Widen the window or switch to all leads." }];
  const r = rates(ls);
  const openUntouched = ls.filter((l) => l.touches === 0 && isOpen(l)).length;
  if (openUntouched > 0)
    out.push({
      tone: "bad",
      title: `${n0(openUntouched)} leads have never been contacted`,
      body: "These are paid-for or earned enquiries nobody has called. Start here: it is the cheapest win.",
    });
  if (r.junk / n > 0.05)
    out.push({
      tone: "warn",
      title: `${ps(r.junk, n)} of leads are wrong numbers or duplicates`,
      body: "Add phone validation on the website form and ask the paid portals for refunds or credits on bad numbers.",
    });
  const bySrc = Array.from(groupBy(ls, (l) => l.channel).entries())
    .map(([name, a]) => ({ name, ...rates(a) }))
    .filter((s) => s.n >= 15 && s.name !== NO_SOURCE);
  const best = [...bySrc].sort((a, b) => b.conv / b.n - a.conv / a.n)[0];
  const worst = [...bySrc].sort((a, b) => b.lost / b.n - a.lost / a.n)[0];
  if (best && best.conv > 0)
    out.push({ tone: "good", title: `${best.name} converts best (${ps(best.conv, best.n)})`, body: "If you pay for leads, this is where extra budget or effort earns the most." });
  if (worst && worst.lost / worst.n > 0.5)
    out.push({ tone: "warn", title: `${worst.name} wastes the most (${ps(worst.lost, worst.n)} lost)`, body: "Check lead quality with this source before spending more on it." });
  const fast = ls.filter((l) => l.firstTouchMs !== null && l.firstTouchMs <= DAY_MS);
  const slow = ls.filter((l) => l.firstTouchMs !== null && l.firstTouchMs > DAY_MS);
  if (fast.length >= 15 && slow.length >= 15 && P(fast.filter(isConv).length, fast.length) > P(slow.filter(isConv).length, slow.length))
    out.push({
      tone: "info",
      title: `Calling within a day converts ${ps(fast.filter(isConv).length, fast.length)} vs ${ps(slow.filter(isConv).length, slow.length)} when slower`,
      body: "Speed of first call is a lever you fully control.",
    });
  return out;
}

export function Overview({ ls, now }: VP) {
  const b = bucketCounts(ls);
  const n = ls.length;
  const conv = b.CONVERTED;
  const lost = kindTotal(b, ["waste", "junk"]);
  const junk = kindTotal(b, ["junk"]);
  const open = kindTotal(b, ["open", "neutral"]);
  const never = ls.filter((l) => l.touches === 0).length;
  const contacted = ls.filter((l) => l.touches > 0 || isConv(l)).length;
  const spoke = ls.filter((l) => (l.touches > 0 || isConv(l)) && l.state !== "NOT_REACHABLE" && l.state !== "WRONG_NUMBER" && l.state !== "DUPLICATE").length;
  const insights = buildInsights(ls);

  const perDay = groupBy(ls, (l) => l.ymd);
  const perMonth = groupBy(ls, (l) => l.ym);
  const rows: HRow[] = (Object.keys(BUCKETS) as Bucket[])
    .filter((k) => b[k] > 0)
    .map((k) => ({ label: BUCKETS[k].label, value: b[k], text: `${n0(b[k])} (${ps(b[k], n)})`, sub: BUCKETS[k].help, tone: KIND_TONE[BUCKETS[k].kind] }));

  return (
    <div className="space-y-6">
      <div className={grid4}>
        <Stat label="Leads received" value={n0(n)} />
        <Stat label="Converted" value={n0(conv)} sub={`${ps(conv, n)} of leads`} tone="good" />
        <Stat label="Wasted" value={ps(lost, n)} sub={`${n0(lost)} leads lost, ${n0(junk)} of them bad data`} tone={lost / Math.max(n, 1) > 0.6 ? "bad" : "warn"} />
        <Stat label="Never contacted" value={n0(never)} sub={`${ps(never, n)} of leads`} tone={never > 0 ? "bad" : "good"} />
      </div>

      {insights.length > 0 && (
        <Section title="What stands out" why="Plain-English findings from your data. Read this first.">
          <div className="grid gap-3 lg:grid-cols-2">
            {insights.map((i, k) => (
              <Insight key={k} tone={i.tone} title={i.title}>
                {i.body}
              </Insight>
            ))}
          </div>
        </Section>
      )}

      <Section title="The lead funnel" why="How many leads survive each stage. The biggest drop is where to focus.">
        <Funnel
          steps={[
            { label: "Received", value: n },
            { label: "Contacted at least once", value: contacted },
            { label: "Reached a real person (not junk or unreachable)", value: spoke },
            { label: "Converted", value: conv },
          ]}
        />
        <p className="mt-3 text-xs text-muted-foreground">Still open (being worked or waiting): {n0(open)}.</p>
      </Section>

      <Section title="Where every lead ended up" why="Green is money, amber is real people lost, red is bad data you should stop paying for.">
        <HBars rows={rows} max={n} />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Leads per day" why="Last 30 days, India time.">
          <VBars bars={lastDays(now, 30).map((d) => ({ label: d.label, value: perDay.get(d.key)?.length ?? 0 }))} labelEvery={3} />
        </Section>
        <Section title="Leads per month" why="Last 12 months. A sudden dip usually means an import or tracking gap, not real demand.">
          <VBars bars={lastMonths(now, 12).map((m) => ({ label: m.label, value: perMonth.get(m.key)?.length ?? 0 }))} showValues />
        </Section>
      </div>
    </div>
  );
}

// ================= WASTED LEADS =================
export function Waste({ ls, now }: VP) {
  const b = bucketCounts(ls);
  const n = ls.length;
  const lost = kindTotal(b, ["waste", "junk"]);
  const wasteKeys = (Object.keys(BUCKETS) as Bucket[]).filter((k) => ["waste", "junk"].includes(BUCKETS[k].kind));
  const reasons: HRow[] = wasteKeys
    .map((k) => ({ label: BUCKETS[k].label, value: b[k], text: `${n0(b[k])} (${ps(b[k], n)} of all leads)`, sub: BUCKETS[k].help, tone: KIND_TONE[BUCKETS[k].kind] }))
    .sort((a, c) => c.value - a.value);
  const base = P(lost, n);

  const bySrc = Array.from(groupBy(ls, (l) => l.channel).entries())
    .map(([name, a]) => ({ name, ...rates(a), unreach: a.filter((l) => l.state === "NOT_REACHABLE").length, notint: a.filter((l) => l.state === "NOT_INTERESTED").length }))
    .sort((a, c) => c.n - a.n);

  const byMonth = groupBy(ls, (l) => l.ym);
  const wd = groupBy(ls, (l) => String(l.wd));
  const reactivate = ls.filter((l) => (l.state === "NOT_INTERESTED" || l.state === "NOT_REACHABLE") && l.phoneOk && now - l.lastTouch > 60 * DAY_MS);
  const reactBySrc: HRow[] = Array.from(groupBy(reactivate, (l) => l.channel).entries())
    .map(([label, a]) => ({ label, value: a.length }))
    .sort((a, c) => c.value - a.value)
    .slice(0, 6);
  const early = ls.filter((l) => (l.state === "NOT_INTERESTED" || l.state === "NOT_REACHABLE") && l.touches <= 1);

  return (
    <div className="space-y-6">
      <div className={grid4}>
        <Stat label="Wasted leads" value={n0(lost)} sub={`${ps(lost, n)} of ${n0(n)}`} tone="bad" />
        <Stat label="Not interested / lost" value={n0(b.NOT_INTERESTED)} sub={ps(b.NOT_INTERESTED, n)} tone="warn" />
        <Stat label="Wrong / fake number" value={n0(b.WRONG_NUMBER)} sub={ps(b.WRONG_NUMBER, n)} tone="bad" />
        <Stat label="Not reachable" value={n0(b.NOT_REACHABLE)} sub={ps(b.NOT_REACHABLE, n)} tone="warn" />
      </div>

      <Section title="Why leads are wasted" why="Each reason needs a different fix: bad data means fix the source, 'not interested' means fix the pitch, 'not reachable' means change when and how you call.">
        <HBars rows={reasons} max={n} />
      </Section>

      <Section title="Waste by source" why="Which channel brings the most junk. Compare the red columns before paying for more leads from a source.">
        <Table
          cols={[{ h: "Source" }, { h: "Leads", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }, { h: "Bad data", right: true }, { h: "Unreachable", right: true }, { h: "Never called", right: true }]}
          rows={bySrc.map((s) => [
            <span key="n" className={s.name === NO_SOURCE ? "text-muted-foreground" : ""}>{s.name}</span>,
            n0(s.n),
            ps(s.conv, s.n),
            <Badge key="l" tone={rel(P(s.lost, s.n), base, true)}>{ps(s.lost, s.n)}</Badge>,
            <Badge key="j" tone={P(s.junk, s.n) > 8 ? "bad" : "muted"}>{ps(s.junk, s.n)}</Badge>,
            ps(s.unreach, s.n),
            n0(s.never),
          ])}
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Waste by month of arrival" why="Is quality getting better or worse? Each row is one month's leads and what happened to them.">
          <Table
            cols={[{ h: "Month" }, { h: "Leads", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }]}
            rows={lastMonths(now, 12)
              .reverse()
              .map((m) => {
                const a = byMonth.get(m.key) ?? [];
                return [m.label, n0(a.length), ps(a.filter(isConv).length, a.length), ps(a.filter(isLost).length, a.length)];
              })}
          />
        </Section>
        <Section title="Waste by weekday" why="Share of leads lost, by the weekday they arrived. For website leads this is customer timing; for others it is when staff logged them.">
          <VBars bars={WEEKDAYS.map((label, i) => ({ label, value: P((wd.get(String(i)) ?? []).filter(isLost).length, (wd.get(String(i)) ?? []).length) }))} showValues suffix="%" />
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Reactivation pool" why="Leads that said no or never picked up, and were last touched over 60 days ago, with a usable number. A fresh WhatsApp or call campaign costs almost nothing.">
          <p className="mb-3 text-3xl font-semibold tabular-nums">{n0(reactivate.length)}</p>
          <HBars rows={reactBySrc} />
        </Section>
        <Section title="Given up too early?" why="Leads marked not interested or unreachable after zero or one attempt. Usually a few more tries at different times of day recover some.">
          <p className="text-3xl font-semibold tabular-nums">{n0(early.length)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{ps(early.length, Math.max(1, b.NOT_INTERESTED + b.NOT_REACHABLE))} of all not interested / unreachable leads.</p>
        </Section>
      </div>
    </div>
  );
}

// ================= TEAM & SPEED =================
export function Team({ ls, now, names }: VP & { names: Map<string, string> }) {
  const byStaff = Array.from(groupBy(ls, (l) => l.assignee ?? "__none").entries())
    .map(([id, a]) => {
      const r = rates(a);
      return {
        id,
        name: id === "__none" ? "Unassigned" : names.get(id) ?? `Staff ...${id.slice(-4)}`,
        ...r,
        contacted: a.filter((l) => l.touches > 0 || isConv(l)).length,
        first: median(a.filter((l) => l.firstTouchMs !== null).map((l) => l.firstTouchMs as number)),
        stale: a.filter((l) => isOpen(l) && now - l.lastTouch > 7 * DAY_MS).length,
      };
    })
    .sort((a, c) => c.n - a.n);
  const baseConv = P(ls.filter(isConv).length, ls.length);

  const speed = groupBy(ls, (l) => speedLabel(l.firstTouchMs));
  const speedOrder = [...SPEED.map((s) => s.label), NEVER];
  const att = groupBy(ls, (l) => (l.touches >= 6 ? "6+" : l.touches >= 4 ? "4-5" : String(l.touches)));
  const stale = (d: number) => ls.filter((l) => isOpen(l) && now - l.lastTouch > d * DAY_MS).length;

  return (
    <div className="space-y-6">
      <div className={grid3}>
        <Stat label="Open leads untouched 7+ days" value={n0(stale(7))} tone={stale(7) > 0 ? "warn" : "good"} />
        <Stat label="Open leads untouched 14+ days" value={n0(stale(14))} tone={stale(14) > 0 ? "warn" : "good"} />
        <Stat label="Open leads untouched 30+ days" value={n0(stale(30))} tone={stale(30) > 0 ? "bad" : "good"} />
      </div>

      <Section title="Team performance" why="Who converts, who loses leads, who is slow. Compare people on the same kind of leads before drawing conclusions.">
        <Table
          cols={[{ h: "Staff" }, { h: "Leads", right: true }, { h: "Contacted", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }, { h: "Median 1st call", right: true }, { h: "Stale 7d+", right: true }]}
          rows={byStaff.map((s) => [
            s.name,
            n0(s.n),
            ps(s.contacted, s.n),
            <Badge key="c" tone={rel(P(s.conv, s.n), baseConv, false)}>{ps(s.conv, s.n)}</Badge>,
            ps(s.lost, s.n),
            fmtDur(s.first),
            n0(s.stale),
          ])}
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Workload split" why="Is auto-assignment spreading leads evenly?">
          <HBars rows={byStaff.map((s) => ({ label: s.name, value: s.n, text: n0(s.n), tone: "info" as Tone }))} />
        </Section>
        <Section title="Does calling faster help?" why="Conversion by time until the first call. If the top rows win, speed matters.">
          <Table
            cols={[{ h: "First call" }, { h: "Leads", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }]}
            rows={speedOrder.map((k) => {
              const a = speed.get(k) ?? [];
              return [k, n0(a.length), ps(a.filter(isConv).length, a.length), ps(a.filter(isLost).length, a.length)];
            })}
          />
        </Section>
      </div>

      <Section title="Do more attempts help?" why="Conversion by number of logged calls or remarks per lead. If conversion keeps rising with attempts, giving up early costs money.">
        <Table
          cols={[{ h: "Attempts" }, { h: "Leads", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }]}
          rows={["0", "1", "2", "3", "4-5", "6+"].map((k) => {
            const a = att.get(k) ?? [];
            return [k, n0(a.length), ps(a.filter(isConv).length, a.length), ps(a.filter(isLost).length, a.length)];
          })}
        />
      </Section>
    </div>
  );
}

// ================= SEO & WEBSITE =================
export function Seo({ all, now, repeatTotal }: { all: L[]; now: number; repeatTotal: number }) {
  const web = all.filter((l) => l.isWeb);
  const other = all.filter((l) => !l.isWeb);
  const w = rates(web);
  const o = rates(other);
  const tagged = web.filter((l) => l.page);
  const untracked = web.length - tagged.length;

  const byPage = Array.from(groupBy(web, (l) => l.page ?? "(page not recorded)").entries())
    .map(([name, a]) => ({ name, type: pageTypeOf(name === "(page not recorded)" ? null : name), ...rates(a), first: Math.min(...a.map((l) => l.t)), last: Math.max(...a.map((l) => l.t)) }))
    .sort((a, c) => c.n - a.n);
  const byType = Array.from(groupBy(tagged, (l) => pageTypeOf(l.page)).entries())
    .map(([name, a]) => ({ name, ...rates(a) }))
    .sort((a, c) => c.n - a.n);

  const hour = Array(24).fill(0) as number[];
  const wdc = Array(7).fill(0) as number[];
  for (const l of web) {
    hour[l.hour] = (hour[l.hour] ?? 0) + 1;
    wdc[l.wd] = (wdc[l.wd] ?? 0) + 1;
  }
  const topHour = hour.indexOf(Math.max(...hour));
  const topDay = wdc.indexOf(Math.max(...wdc));
  const perMonth = groupBy(web, (l) => l.ym);

  const todo: { tone: Tone; title: string; body: string }[] = [];
  if (web.length && untracked / web.length > 0.5)
    todo.push({ tone: "bad", title: `${ps(untracked, web.length)} of website leads have no page recorded`, body: "Record the exact URL, referrer and UTM tags with every enquiry (the next build step). Without it you cannot link leads to specific pages or to organic vs ads." });
  const best = byType.filter((t) => t.n >= 3).sort((a, c) => c.conv / c.n - a.conv / a.n)[0];
  if (best && best.conv > 0)
    todo.push({ tone: "good", title: `${best.name} pages convert best (${ps(best.conv, best.n)})`, body: "Publish more pages of this type and link to them from the home page and from each other." });
  const busiest = byType[0];
  if (busiest) todo.push({ tone: "info", title: `Most leads come from ${busiest.name} pages (${n0(busiest.n)})`, body: "This is the page style your visitors respond to. Expand it first." });
  const dud = byPage.filter((p) => p.name !== "(page not recorded)" && p.n >= 2 && p.conv === 0).slice(0, 3);
  if (dud.length)
    todo.push({ tone: "warn", title: `Pages with leads but no conversions: ${dud.map((d) => d.name).join(", ")}`, body: "The page attracts enquiries that do not close. Check that the copy sets the right expectations on profiles, fees and location." });
  if (w.n >= 10 && w.junk / w.n > 0.08)
    todo.push({ tone: "warn", title: `${ps(w.junk, w.n)} of website leads are bad numbers`, body: "Add phone-number validation or a WhatsApp/OTP check to the form so real prospects are not mixed with typos." });
  if (w.n >= 10)
    todo.push({ tone: "info", title: `Website enquiries peak on ${WEEKDAYS[topDay]} around ${topHour}:00`, body: "Have someone ready to reply in that window, and time Google Business Profile posts and social shares just before it." });

  const general = [
    "Connect Google Search Console: it adds impressions, clicks, ranking and search queries per page, which this CRM cannot know.",
    "Every page in the sitemap should carry the enquiry form or a click-to-call/WhatsApp button, and send its own page name with the form.",
    "Link from the home page to your best-converting city and community pages, and cross-link related pages.",
    "Add real success stories, verified-profile counts and fees on the top pages: matrimonial visitors need trust signals before they enquire.",
    "Keep a Google Business Profile with reviews and posts: it drives local 'near me' enquiries that never show up as a page.",
  ];

  return (
    <div className="space-y-6">
      <div className={grid4}>
        <Stat label="Website leads" value={n0(w.n)} sub={`${ps(w.n, all.length)} of all leads`} />
        <Stat label="Website conversion" value={ps(w.conv, w.n)} sub={`others: ${ps(o.conv, o.n)}`} tone={P(w.conv, w.n) >= P(o.conv, o.n) ? "good" : "warn"} />
        <Stat label="Website leads with a page" value={n0(tagged.length)} sub={tagged.length ? `since ${dateLabel(Math.min(...tagged.map((l) => l.t)))}` : "none yet"} />
        <Stat label="Repeat website enquiries" value={n0(repeatTotal)} sub="same number enquired again (strong intent)" tone="info" />
      </div>

      <Section title="SEO to-do list from your data" why="Each item comes from real patterns in your leads. Blue and green are opportunities, amber and red are problems.">
        {todo.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough website leads yet for data-driven suggestions.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {todo.map((t, i) => (
              <Insight key={i} tone={t.tone} title={t.title}>
                {t.body}
              </Insight>
            ))}
          </div>
        )}
      </Section>

      <Section title="Website vs every other channel" why="Are website visitors better or worse leads than the ones you pay for?">
        <Table
          cols={[{ h: "Channel group" }, { h: "Leads", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }, { h: "Bad data", right: true }, { h: "Never called", right: true }]}
          rows={[
            ["Website form", n0(w.n), ps(w.conv, w.n), ps(w.lost, w.n), ps(w.junk, w.n), ps(w.never, w.n)],
            ["All other channels", n0(o.n), ps(o.conv, o.n), ps(o.lost, o.n), ps(o.junk, o.n), ps(o.never, o.n)],
          ]}
        />
      </Section>

      <Section title="What type of page brings leads" why="City, community and niche pages compared. Page types are guessed from the page name.">
        <Table
          cols={[{ h: "Page type" }, { h: "Leads", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }]}
          rows={byType.map((t) => [t.name, n0(t.n), ps(t.conv, t.n), ps(t.lost, t.n)])}
          empty="No page-tagged leads yet."
        />
      </Section>

      <Section title="Leads by page" why="Every page that has produced a lead. Pages missing from this list have produced none.">
        <Table
          cols={[{ h: "Page" }, { h: "Type" }, { h: "Leads", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }, { h: "Latest", right: true }]}
          rows={byPage.map((p) => [p.name, <Badge key="t">{p.type}</Badge>, n0(p.n), ps(p.conv, p.n), ps(p.lost, p.n), dateLabel(p.last)])}
          empty="No website leads yet."
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="When website visitors enquire (hour)" why="Real customer timing, India time. Reply fastest here.">
          <VBars bars={hour.map((v, h) => ({ label: String(h), value: v }))} labelEvery={3} />
        </Section>
        <Section title="When website visitors enquire (weekday)">
          <VBars bars={WEEKDAYS.map((label, i) => ({ label, value: wdc[i] ?? 0 }))} showValues />
        </Section>
      </div>

      <Section title="Website leads per month" why="Your organic growth line. It should trend up as SEO work lands.">
        <VBars bars={lastMonths(now, 12).map((m) => ({ label: m.label, value: perMonth.get(m.key)?.length ?? 0 }))} showValues />
      </Section>

      <Section title="General SEO checklist" why="Not derived from your leads. These are standard steps for a local matrimonial business.">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {general.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </Section>

      <Insight tone="muted" title="What this page cannot tell you yet">
        Impressions, clicks, search queries, rankings, and whether a lead came from organic search or ads. That needs Search Console and per-enquiry tracking of URL, referrer and UTM tags.
      </Insight>
    </div>
  );
}

// ================= TRAFFIC & CHANNELS =================
export function Traffic({ events, leads }: { events: TrafficEvent[]; leads: L[] }) {
  if (events.length === 0)
    return (
      <Insight tone="info" title="Collecting data">
        Tracking is live, but no tracked enquiry has arrived yet. This tab fills in as new website enquiries come in.
      </Insight>
    );

  const byId = new Map(leads.map((l) => [l.id, l] as const));
  const first = events.filter((e) => !e.isRepeat);
  const repeats = events.length - first.length;
  const joined = first.flatMap((e) => {
    const l = byId.get(e.leadId);
    return l ? [{ e, l }] : [];
  });
  const total = joined.length;
  const since = dateLabel(Math.min(...events.map((e) => e.createdAt)));
  const stats = (a: { e: TrafficEvent; l: L }[]) => rates(a.map((x) => x.l));

  const byChannel = Array.from(groupBy(joined, (x) => x.e.channel).entries())
    .map(([name, a]) => ({ name, ...stats(a) }))
    .sort((a, b) => b.n - a.n);
  const byLanding = Array.from(groupBy(joined, (x) => x.e.landingPath ?? "(not recorded)").entries())
    .map(([name, a]) => ({ name, ...stats(a) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 15);
  const byDevice = Array.from(groupBy(joined, (x) => x.e.device ?? "unknown").entries())
    .map(([name, a]) => ({ name, ...stats(a) }))
    .sort((a, b) => b.n - a.n);
  const byCampaign = Array.from(
    groupBy(
      joined.filter((x) => x.e.utmCampaign),
      (x) => `${x.e.utmCampaign} (${x.e.utmSource ?? "no source"})`
    ).entries()
  )
    .map(([name, a]) => ({ name, ...stats(a) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 15);

  const depth: [string, (n: number) => boolean][] = [
    ["1 page", (n) => n <= 1],
    ["2 to 3 pages", (n) => n >= 2 && n <= 3],
    ["4 or more pages", (n) => n >= 4],
  ];
  const withDepth = joined.filter((x) => x.e.pagesViewed !== null);
  const byDepth = depth
    .map(([name, f]) => ({ name, ...stats(withDepth.filter((x) => f(x.e.pagesViewed ?? 0))) }))
    .filter((d) => d.n > 0);
  const avgPages = withDepth.length
    ? Math.round((withDepth.reduce((s, x) => s + (x.e.pagesViewed ?? 0), 0) / withDepth.length) * 10) / 10
    : 0;
  const mobile = joined.filter((x) => x.e.device === "mobile").length;

  const notes: { tone: Tone; title: string; body: string }[] = [];
  if (total < 20)
    notes.push({
      tone: "info",
      title: `Only ${n0(total)} tracked enquiries so far`,
      body: `Tracking began on ${since}. Treat percentages as rough until you have about 30 or more. Older website leads carry no channel data.`,
    });
  const paid = byChannel.find((c) => c.name === "Paid ads");
  if (paid && paid.n >= 5 && paid.lost / paid.n > 0.5)
    notes.push({
      tone: "warn",
      title: `Paid ads waste ${ps(paid.lost, paid.n)} of their enquiries`,
      body: "Check the campaign table below. Pause or tighten the campaigns that bring the worst leads.",
    });
  const organic = byChannel.find((c) => c.name === "Organic search");
  if (organic && total >= 10)
    notes.push({
      tone: "good",
      title: `Organic search brings ${ps(organic.n, total)} of tracked enquiries`,
      body: "This is free traffic. Your SEO work is what grows this line.",
    });
  const direct = byChannel.find((c) => c.name === "Direct");
  if (direct && total >= 10 && direct.n / total > 0.5)
    notes.push({
      tone: "info",
      title: `${ps(direct.n, total)} of enquiries arrive with no visible source`,
      body: "This is often WhatsApp shares, saved links or apps that hide the source. Add UTM tags to every link you share.",
    });

  return (
    <div className="space-y-6">
      <div className={grid4}>
        <Stat label="Tracked enquiries" value={n0(total)} sub={`since ${since}`} />
        <Stat label="Mobile share" value={ps(mobile, total)} sub="of tracked enquiries" />
        <Stat label="Avg pages viewed" value={String(avgPages)} sub="before enquiring" />
        <Stat label="Repeat enquiries" value={n0(repeats)} sub="same person enquired again" tone="info" />
      </div>

      {notes.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          {notes.map((t, i) => (
            <Insight key={i} tone={t.tone} title={t.title}>
              {t.body}
            </Insight>
          ))}
        </div>
      )}

      <Section title="Where enquiries come from" why="Organic search, ads, social, WhatsApp and direct visits, from the visitor's referrer and UTM tags.">
        <HBars rows={byChannel.map((c) => ({ label: c.name, value: c.n, text: `${n0(c.n)} (${ps(c.n, total)})` }))} />
      </Section>

      <Section title="Channel quality" why="Which channels bring leads that close, and which bring waste. Conversion needs time, so it starts low.">
        <Table
          cols={[{ h: "Channel" }, { h: "Enquiries", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }, { h: "Bad data", right: true }, { h: "Never called", right: true }]}
          rows={byChannel.map((c) => [c.name, n0(c.n), ps(c.conv, c.n), ps(c.lost, c.n), ps(c.junk, c.n), ps(c.never, c.n)])}
        />
      </Section>

      <Section title="Top landing pages" why="The first page the visitor saw. These are the pages that pull people in.">
        <Table
          cols={[{ h: "Landing page" }, { h: "Enquiries", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }]}
          rows={byLanding.map((p) => [p.name, n0(p.n), ps(p.conv, p.n), ps(p.lost, p.n)])}
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Mobile vs desktop">
          <Table
            cols={[{ h: "Device" }, { h: "Enquiries", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }]}
            rows={byDevice.map((d) => [d.name, n0(d.n), ps(d.conv, d.n), ps(d.lost, d.n)])}
          />
        </Section>
        <Section title="Pages viewed before enquiring" why="Do people who read more pages enquire better?">
          <Table
            cols={[{ h: "Depth" }, { h: "Enquiries", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }]}
            rows={byDepth.map((d) => [d.name, n0(d.n), ps(d.conv, d.n), ps(d.lost, d.n)])}
            empty="No page depth recorded yet."
          />
        </Section>
      </div>

      {byCampaign.length > 0 && (
        <Section title="Campaigns" why="Only enquiries that carried a utm_campaign tag.">
          <Table
            cols={[{ h: "Campaign" }, { h: "Enquiries", right: true }, { h: "Converted", right: true }, { h: "Wasted", right: true }]}
            rows={byCampaign.map((c) => [c.name, n0(c.n), ps(c.conv, c.n), ps(c.lost, c.n)])}
          />
        </Section>
      )}

      <Insight tone="muted" title="What this tab covers">
        Only website enquiries sent after tracking went live. Older leads have no channel data. Impressions and search queries still need Search Console.
      </Insight>
    </div>
  );
}

// ================= DATA QUALITY =================
export function DataQuality({ ls, now, statusRaw, outcomeRaw }: VP & { statusRaw: Map<string, number>; outcomeRaw: Map<string, number> }) {
  const n = ls.length;
  const noSource = ls.filter((l) => l.channel === NO_SOURCE).length;
  const badPhone = ls.filter((l) => !l.phoneOk).length;
  const dup = ls.filter((l) => l.dupPhone).length;
  const noEmail = ls.filter((l) => !l.hasEmail).length;
  const noGender = ls.filter((l) => !l.hasGender).length;
  const perMonth = groupBy(ls, (l) => l.ym);
  const months = lastMonths(now, 14).map((m) => ({ ...m, v: perMonth.get(m.key)?.length ?? 0 }));
  const med = median(months.map((m) => m.v)) ?? 0;

  const mapRows = (m: Map<string, number>) =>
    Array.from(m.entries())
      .sort((a, c) => c[1] - a[1])
      .map(([raw, cnt]) => {
        const b = classify(raw);
        return [raw || "(empty)", n0(cnt), <Badge key={raw} tone={b === "OTHER" ? "bad" : KIND_TONE[BUCKETS[b].kind]}>{BUCKETS[b].label}</Badge>];
      });

  return (
    <div className="space-y-6">
      <div className={grid4}>
        <Stat label="No source recorded" value={ps(noSource, n)} sub={`${n0(noSource)} leads`} tone={noSource / Math.max(n, 1) > 0.3 ? "warn" : "good"} />
        <Stat label="Invalid-looking phone" value={ps(badPhone, n)} sub={`${n0(badPhone)} leads`} tone={badPhone > 0 ? "warn" : "good"} />
        <Stat label="Shared phone numbers" value={n0(dup)} sub="leads whose number appears more than once" tone={dup > 0 ? "warn" : "good"} />
        <Stat label="Missing email" value={ps(noEmail, n)} sub={`missing gender: ${ps(noGender, n)}`} />
      </div>

      <Section title="Import gaps" why="Months far below normal usually mean missing data, not missing demand. Do not read trends across them.">
        <Table
          cols={[{ h: "Month" }, { h: "Leads", right: true }, { h: "Check" }]}
          rows={months.map((m) => [m.label, n0(m.v), m.v < med * 0.25 ? <Badge key={m.key} tone="bad">Unusually low, check import</Badge> : ""])}
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="How your lead statuses were sorted" why="Red means the analytics could not recognise it. If a value sits in the wrong bucket, edit the RULES list in src/lib/analytics/lead-model.ts.">
          <Table cols={[{ h: "Status value" }, { h: "Leads", right: true }, { h: "Counted as" }]} rows={mapRows(statusRaw)} />
        </Section>
        <Section title="How your call outcomes were sorted" why="Outcomes decide whether a lead counts as not interested, unreachable, wrong number, etc.">
          <Table cols={[{ h: "Outcome value" }, { h: "Remarks", right: true }, { h: "Counted as" }]} rows={mapRows(outcomeRaw)} />
        </Section>
      </div>
    </div>
  );
}
