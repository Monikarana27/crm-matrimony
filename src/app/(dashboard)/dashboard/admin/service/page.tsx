import { DashboardHero } from "@/components/layout/dashboard-hero";
import { KpiTile } from "@/components/widgets/kpi-tile";
import { StatWidget } from "@/components/widgets/stat-widget";
import { getServiceNeedsAttention } from "@/lib/stats/dashboard-stats";
import { getMissedWeeklyShares, getOverdueWelcomeCalls } from "@/lib/stats/client-flags";
import { ServicePerformanceTable } from "@/components/shared/service-performance-table";
import {
  getOwnerSummary,
  getServiceOverview,
  getDailyServiceReport,
  getMonthlyServiceReport,
} from "@/lib/stats/dashboard-stats";
import {
  Contact, IndianRupee, Users, PauseCircle, CalendarClock,
  Send, CreditCard, Clock, Trophy, UserCheck, Handshake,
  Heart, Users2, Ban, AlertTriangle, PhoneMissed,
} from "lucide-react";
import { NeedsAttentionWidget } from "@/components/widgets/needs-attention-widget";

export default async function AdminServiceDashboardPage() {
  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const summary = await getOwnerSummary();
  const overview = await getServiceOverview();
  const dailyReport = await getDailyServiceReport(now);
  const monthlyReport = await getMonthlyServiceReport(now.getMonth() + 1, now.getFullYear());
  const needsAttention = await getServiceNeedsAttention();
  const [missedShares, overdueCalls] = await Promise.all([
    getMissedWeeklyShares(),
    getOverdueWelcomeCalls({ department: "SERVICE" }),
  ]);
  return (
    <div className="space-y-6">
      <DashboardHero
        title="Service Department — Overview"
        subtitle="Org-wide client servicing, matchmaking activity, and success outcomes."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatWidget
          title="Welcome Calls Overdue"
          icon={PhoneMissed}
          accentColor="rose"
          badge={{
            text: overdueCalls.count > 0 ? "Needs Attention" : "All Good",
            className:
              overdueCalls.count > 0
                ? "bg-red-100 text-red-700 border-red-200"
                : "bg-emerald-100 text-emerald-700 border-emerald-200",
          }}
          lines={[{ label: "Pending 24h+", value: overdueCalls.count }]}
          actionLabel="View Welcome Calls"
          actionHref="/dashboard/welcome-calls?department=SERVICE&status=PENDING"
        />
        <StatWidget
          title="Missed Weekly Shares"
          icon={Send}
          accentColor="amber"
          badge={{
            text: missedShares.count > 0 ? "Needs Attention" : "All Good",
            className:
              missedShares.count > 0
                ? "bg-red-100 text-red-700 border-red-200"
                : "bg-emerald-100 text-emerald-700 border-emerald-200",
          }}
          lines={[{ label: "No share in 7+ days", value: missedShares.count }]}
          actionLabel="View Clients"
          actionHref="/dashboard/admin/missed-weekly-shares"
        />
      </div>

      <NeedsAttentionWidget items={needsAttention} />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">MANAGEMENT SUMMARY</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiTile label="New Leads Today" value={summary.newLeadsToday} icon={Contact} />
          <KpiTile label="Revenue Today" value={`₹${summary.revenueToday.toLocaleString("en-IN")}`} icon={IndianRupee} tone="success" />
          <KpiTile label="Active Clients" value={summary.activeClients} icon={Users} />
          <KpiTile label="On Hold Clients" value={summary.onHoldClients} icon={PauseCircle} tone="warning" />
          <KpiTile label="Meetings Today" value={summary.meetingsToday} icon={CalendarClock} />
          <KpiTile label="Profiles Shared Today" value={summary.profilesSharedToday} icon={Send} />
          <KpiTile label="Pending Payments" value={summary.pendingPayments} icon={CreditCard} tone="warning" />
          <KpiTile label="Expiring Services (7d)" value={summary.expiringServices} icon={Clock} tone="danger" />
          <KpiTile label="Success Stories" value={summary.successStoriesThisMonth} icon={Trophy} tone="success" />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">ONGOING SERVICES</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile label="Active" value={overview.stages.active} icon={UserCheck} />
          <KpiTile label="On Hold" value={overview.stages.onHold} icon={PauseCircle} tone="warning" />
          <KpiTile label="Meeting Stage" value={overview.stages.meetingStage} icon={CalendarClock} />
          <KpiTile label="Family Discussion" value={overview.stages.familyDiscussion} icon={Users2} />
          <KpiTile label="Marriage Fixed" value={overview.stages.marriageFixed} icon={Handshake} tone="success" />
          <KpiTile label="Success Closed" value={overview.stages.successClosed} icon={Heart} tone="success" />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">EXPIRING SERVICES</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiTile label="Expiring in 7 Days" value={overview.expiring.in7Days} icon={AlertTriangle} tone="danger" />
          <KpiTile label="Expiring in 30 Days" value={overview.expiring.in30Days} icon={Clock} tone="warning" />
          <KpiTile label="Expired" value={overview.expiring.expired} icon={Ban} tone="danger" />
        </div>
      </div>

      <ServicePerformanceTable
        title="Daily Performance"
        subtitle={now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        rows={dailyReport}
        variant="daily"
      />

      <ServicePerformanceTable
        title="Monthly Performance"
        subtitle={monthLabel}
        rows={monthlyReport}
        variant="monthly"
      />
    </div>
  );
}