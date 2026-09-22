import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Pill } from "@/components/analytics/kit";
import { DataQuality, Overview, Seo, Team, Traffic, Waste } from "@/components/analytics/views";
import { DAY_MS, loadLeads, loadNames } from "@/lib/analytics/lead-model";
import { loadTrafficEvents } from "@/lib/analytics/enquiry-events";

const VIEWS: [string, string][] = [
  ["overview", "Overview"],
  ["waste", "Wasted leads"],
  ["team", "Team & speed"],
  ["seo", "SEO & website"],
  ["traffic", "Traffic & channels"],
  ["data", "Data quality"],
];

export default async function LeadAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; scope?: string; days?: string }>;
}) {
  const sp = await searchParams;
  const view = VIEWS.some(([k]) => k === sp.view) ? (sp.view as string) : "overview";
  const scope = sp.scope === "website" ? "website" : "all";
  const days = [30, 90, 365].includes(Number(sp.days)) ? Number(sp.days) : 0;
  const href = (v: string, s = scope, d = days) => `/dashboard/admin/lead-analytics?view=${v}&scope=${s}&days=${d}`;

  const data = await loadLeads();
  const now = Date.now();
  const pool = scope === "website" ? data.leads.filter((l) => l.isWeb) : data.leads;
  const ls = days ? pool.filter((l) => l.t >= now - days * DAY_MS) : pool;
  const assignees = Array.from(new Set(data.leads.map((l) => l.assignee).filter((x): x is string => !!x)));
  const names = view === "team" ? await loadNames(assignees) : new Map<string, string>();
  const showFilters = view !== "seo" && view !== "data" && view !== "traffic";
  const events = view === "traffic" ? await loadTrafficEvents() : [];

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Lead Analytics"
        subtitle="Where leads come from, how many are wasted and why, how your team handles them, and what your website pages earn. Recalculated every time you open it."
      />

      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map(([k, label]) => (
          <Pill key={k} href={href(k)} active={view === k}>
            {label}
          </Pill>
        ))}
        <Pill href="/dashboard/admin/lead-analytics/report" active={false}>Download PDF report</Pill>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Show</span>
            <Pill href={href(view, "all")} active={scope === "all"}>All leads</Pill>
            <Pill href={href(view, "website")} active={scope === "website"}>Website only</Pill>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Window</span>
            <Pill href={href(view, scope, 0)} active={days === 0}>All time</Pill>
            {[30, 90, 365].map((d) => (
              <Pill key={d} href={href(view, scope, d)} active={days === d}>
                {d === 365 ? "1 year" : `${d} days`}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {view === "overview" && <Overview ls={ls} now={now} />}
      {view === "waste" && <Waste ls={ls} now={now} />}
      {view === "team" && <Team ls={ls} now={now} names={names} />}
      {view === "seo" && <Seo all={data.leads} now={now} repeatTotal={data.repeatTotal} />}
      {view === "traffic" && <Traffic events={events} leads={data.leads} />}
      {view === "data" && <DataQuality ls={data.leads} now={now} statusRaw={data.statusRaw} outcomeRaw={data.outcomeRaw} />}

      <p className="text-xs text-muted-foreground">
        Timing note: for phone, WhatsApp and portal leads, the arrival time is when your team logged the lead. Only website leads show when the customer actually enquired.
      </p>
    </div>
  );
}
