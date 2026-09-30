import { DashboardHero } from "@/components/layout/dashboard-hero";
import { StatWidget } from "@/components/widgets/stat-widget";
import { getSalesNeedsAttention } from "@/lib/stats/dashboard-stats";
import { FunnelBreakdown } from "@/components/widgets/funnel-breakdown";
import { ConversionRateCard } from "@/components/widgets/conversion-rate-card";
import { LeadTrendChart } from "@/components/widgets/lead-trend-chart";
import { SalesPerformanceTable } from "@/components/shared/sales-performance-table";
import {
  getOrgSalesStats,
  getOrgNewLeadsBreakdown,
  getOrgLeadPipeline,
  getOrgLeadTrend,
  getDailySalesReport,
  getMonthlySalesReport,
  getOrgFollowUpsDueToday,
} from "@/lib/stats/dashboard-stats";
import { NeedsAttentionWidget } from "@/components/widgets/needs-attention-widget";

const LEADS = "/dashboard/admin/leads";

export default async function AdminSalesDashboardPage() {
  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const stats = await getOrgSalesStats();
  const newLeadsBreakdown = await getOrgNewLeadsBreakdown();
  const pipeline = await getOrgLeadPipeline();
  const trendData = await getOrgLeadTrend(7);
  const dailyReport = await getDailySalesReport(now);
  const monthlyReport = await getMonthlySalesReport(now.getMonth() + 1, now.getFullYear());
  const needsAttention = await getSalesNeedsAttention();
  const followUpsDue = await getOrgFollowUpsDueToday();
  const funnelRows = [
    { label: "New Lead", value: pipeline.newLead, total: pipeline.total, colorClass: "border-blue-400 bg-blue-50", barColorClass: "bg-blue-500", href: `${LEADS}?status=NEW` },
    { label: "Contacted", value: pipeline.contacted, total: pipeline.total, colorClass: "border-cyan-400 bg-cyan-50", barColorClass: "bg-cyan-500", href: `${LEADS}?status=CONTACTED` },
    { label: "Interested", value: pipeline.interested, total: pipeline.total, colorClass: "border-indigo-400 bg-indigo-50", barColorClass: "bg-indigo-500", href: `${LEADS}?status=INTERESTED` },
    { label: "Follow-up", value: pipeline.followUp, total: pipeline.total, colorClass: "border-amber-400 bg-amber-50", barColorClass: "bg-amber-500", href: `${LEADS}?status=PENDING` },
    { label: "Converted", value: pipeline.converted, total: pipeline.total, colorClass: "border-emerald-400 bg-emerald-50", barColorClass: "bg-emerald-500", href: `${LEADS}?status=CONVERTED` },
    { label: "Lost", value: pipeline.lost, total: pipeline.total, colorClass: "border-red-400 bg-red-50", barColorClass: "bg-red-500", href: `${LEADS}?status=NOT_INTERESTED` },
  ];

  const quickActions = [
    { label: "Call New Leads", href: "/dashboard/admin/leads?status=NEW", color: "bg-blue-500" },
    { label: "Contacted Leads", href: "/dashboard/admin/leads?status=CONTACTED", color: "bg-cyan-500" },
    { label: "View Converted", href: "/dashboard/admin/leads?status=CONVERTED", color: "bg-emerald-500" },
    { label: "Pending Follow-ups", href: "/dashboard/admin/leads?status=PENDING", color: "bg-amber-500" },
    { label: "Not Interested", href: "/dashboard/admin/leads?status=NOT_INTERESTED", color: "bg-red-500" },
  ];

  return (
    <div className="space-y-4">
      <DashboardHero
        title="Sales Department — Overview"
        subtitle="Org-wide lead pipeline, conversions, and follow-ups across all sales staff."
      />
      <NeedsAttentionWidget items={needsAttention} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatWidget
          title="New Leads Today"
          lines={[{ label: "Today", value: newLeadsBreakdown.today }]}
          href={`${LEADS}?status=ALL&created=today`}
        />
        <StatWidget
          title="New Leads Yesterday"
          lines={[{ label: "Yesterday", value: newLeadsBreakdown.yesterday }]}
          href={`${LEADS}?status=ALL&created=yesterday`}
        />
        <StatWidget
          title="New Leads This Month"
          lines={[{ label: "This Month", value: newLeadsBreakdown.thisMonth }]}
          href={`${LEADS}?status=ALL&created=month`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatWidget
          title="Total Leads"
          lines={[{ label: "All Leads", value: pipeline.total }]}
          actionLabel="View Leads"
          href={`${LEADS}?status=ALL`}
        />
        <StatWidget
          title="Converted Leads"
          lines={[{ label: "Total", value: pipeline.converted }]}
          href={`${LEADS}?status=CONVERTED`}
        />
        <StatWidget
          title="New Leads Today"
          lines={[{ label: "Today", value: newLeadsBreakdown.today }]}
          href={`${LEADS}?status=ALL&created=today`}
        />
        <StatWidget
          title="Follow-ups Due"
          lines={[{ label: "Due Today", value: followUpsDue }]}
          actionLabel="View Leads"
          href={`${LEADS}?followup=today`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <FunnelBreakdown
            title="Lead Pipeline"
            subtitle="Org-wide lead status breakdown"
            badge="Live Overview"
            rows={funnelRows}
          />
          <LeadTrendChart data={trendData} />
        </div>

        <ConversionRateCard
          rate={stats.leads.conversionRate}
          month={monthLabel}
          todaysActivityCount={stats.todaysActivityCount}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatWidget
          title="Assigned Profiles"
          lines={[{ label: "Assigned", value: stats.profileAssignment.assigned }]}
        />
        <StatWidget
          title="Reassigned Profiles"
          lines={[{ label: "Reassigned", value: stats.profileAssignment.reassigned }]}
        />
        <StatWidget
          title="Unassigned Profiles"
          lines={[{ label: "Unassigned", value: stats.profileAssignment.unassigned }]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {quickActions.map((action) => (
          <a
            key={action.label}
            href={action.href}
            className={`${action.color} flex h-11 items-center justify-center rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90`}
          >
            {action.label}
          </a>
        ))}
      </div>
      <StatWidget
        title="Sales Targets"
        lines={[]}
        actionLabel="View Monthly Targets"
        actionHref="/dashboard/admin/sales-targets"
      />

      <SalesPerformanceTable
        title="Daily Performance"
        subtitle={now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        rows={dailyReport}
      />

      <SalesPerformanceTable
        title="Monthly Performance"
        subtitle={monthLabel}
        rows={monthlyReport}
        showConversionPct
      />
    </div>
  );
}
