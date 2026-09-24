import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  IndianRupee,
  Network,
  PhoneCall,
  Send,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FunnelBreakdown } from "@/components/widgets/funnel-breakdown";
import { ConversionRateCard } from "@/components/widgets/conversion-rate-card";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { getAdminStats, getRecentActivity } from "@/lib/stats/dashboard-stats";
import { QuickActions } from "@/components/widgets/quick-actions";
import { NotificationsPanel } from "@/components/widgets/notifications-panel";
import { getNotifications } from "@/lib/stats/notifications";
import { RecentActivity } from "@/components/widgets/recent-activity";
import { getNonConnectedClients, getMissedWeeklyShares, getOverdueWelcomeCalls } from "@/lib/stats/client-flags";

// ---------- Needs Attention ----------

type Tone = "red" | "amber";

const TONE: Record<Tone, { card: string; chip: string; icon: string; number: string }> = {
  red: {
    card: "border-red-200 border-l-4 border-l-red-500 bg-red-50/70 hover:bg-red-50",
    chip: "bg-red-100",
    icon: "text-red-600",
    number: "text-red-700",
  },
  amber: {
    card: "border-amber-200 border-l-4 border-l-amber-500 bg-amber-50/70 hover:bg-amber-50",
    chip: "bg-amber-100",
    icon: "text-amber-600",
    number: "text-amber-700",
  },
};

type AttentionItem = {
  label: string;
  hint: string;
  count: number;
  href: string;
  icon: LucideIcon;
  tone: Tone;
};

function AttentionCard({ item }: { item: AttentionItem }) {
  const active = item.count > 0;
  const tone = TONE[item.tone];
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex flex-col justify-between rounded-xl border p-4 shadow-sm transition",
        active ? tone.card : "border-border/80 bg-card hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            active ? tone.chip : "bg-emerald-50"
          )}
        >
          <Icon className={cn("h-5 w-5", active ? tone.icon : "text-emerald-600")} />
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className="mt-3">
        <p
          className={cn(
            "text-3xl font-semibold tabular-nums tracking-tight",
            active ? tone.number : "text-muted-foreground/40"
          )}
        >
          {item.count.toLocaleString("en-IN")}
        </p>
        <p className="text-sm font-medium">{item.label}</p>
        <p className="text-xs text-muted-foreground">{active ? item.hint : "All clear"}</p>
      </div>
    </Link>
  );
}

// ---------- Headline KPI cards ----------

type KpiSub = { label: string; value: string | number; warn?: Tone };

function KpiCard({
  title,
  icon: Icon,
  chip,
  iconClass,
  value,
  caption,
  subs,
  progress,
  href,
  hrefLabel,
}: {
  title: string;
  icon: LucideIcon;
  chip: string;
  iconClass: string;
  value: string | number;
  caption: string;
  subs: KpiSub[];
  progress?: number;
  href: string;
  hrefLabel: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border/80 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", chip)}>
          <Icon className={cn("h-4 w-4", iconClass)} />
        </span>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{caption}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
      {subs.length > 0 && (
        <div className="mt-3 flex items-start justify-between gap-3 border-t border-dashed border-border/60 pt-3">
          {subs.map((s) => (
            <div key={s.label}>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  s.warn === "red" && "text-red-600",
                  s.warn === "amber" && "text-amber-600"
                )}
              >
                {s.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      <Link href={href} className="mt-auto pt-3 text-sm font-medium text-primary hover:underline">
        {hrefLabel} →
      </Link>
    </div>
  );
}

// ---------- Page ----------

export default async function AdminDashboardPage() {
  const session = await auth();
  const [stats, recentActivity, notifications, nonConnected, missedShares, overdueCalls] = await Promise.all([
    getAdminStats(),
    getRecentActivity(10),
    getNotifications(),
    getNonConnectedClients(),
    getMissedWeeklyShares(),
    getOverdueWelcomeCalls(),
  ]);

  const servicesTotal =
    stats.services.activeServices + stats.services.holdServices + stats.services.expiredServices;
  const servicesProgress = servicesTotal > 0 ? (stats.services.activeServices / servicesTotal) * 100 : 0;

  const paymentsTotal =
    stats.payments.paidPayments + stats.payments.pendingPayments + stats.payments.failedPayments;
  const paymentsProgress = paymentsTotal > 0 ? (stats.payments.paidPayments / paymentsTotal) * 100 : 0;

  const employeesProgress =
    stats.employees.totalEmployees > 0
      ? (stats.employees.activeEmployees / stats.employees.totalEmployees) * 100
      : 0;

  const funnelTotal = stats.leads.totalLeads;
  const profileFunnelTotal =
    stats.profileAssignment.assigned + stats.profileAssignment.reassigned + stats.profileAssignment.unassigned;

  const funnelRows = [
    {
      label: "New Leads",
      value: stats.leads.newLeads,
      total: funnelTotal,
      colorClass: "border-blue-400 bg-blue-50",
      barColorClass: "bg-blue-500",
    },
    {
      label: "Contacted Leads",
      value: stats.leads.contactedLeads,
      total: funnelTotal,
      colorClass: "border-cyan-400 bg-cyan-50",
      barColorClass: "bg-cyan-500",
    },
    {
      label: "Converted Leads",
      value: stats.leads.convertedLeads,
      total: funnelTotal,
      colorClass: "border-emerald-400 bg-emerald-50",
      barColorClass: "bg-emerald-500",
    },
    {
      label: "Pending Follow-ups",
      value: stats.leads.pendingLeads,
      total: funnelTotal,
      colorClass: "border-amber-400 bg-amber-50",
      barColorClass: "bg-amber-500",
    },
    {
      label: "Not Interested",
      value: stats.leads.notInterestedLeads,
      total: funnelTotal,
      colorClass: "border-red-400 bg-red-50",
      barColorClass: "bg-red-500",
    },
    {
      label: "Assigned Profiles",
      value: stats.profileAssignment.assigned,
      total: profileFunnelTotal,
      colorClass: "border-violet-400 bg-violet-50",
      barColorClass: "bg-violet-500",
    },
    {
      label: "Re-assigned Profiles",
      value: stats.profileAssignment.reassigned,
      total: profileFunnelTotal,
      colorClass: "border-purple-400 bg-purple-50",
      barColorClass: "bg-purple-500",
    },
    {
      label: "Unassigned Profiles",
      value: stats.profileAssignment.unassigned,
      total: profileFunnelTotal,
      colorClass: "border-gray-400 bg-gray-50",
      barColorClass: "bg-gray-500",
    },
  ];

  const now = new Date();
  const currentMonth = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const todayLabel = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const t = stats.todaysSummary;

  // Urgent (red) first, then amber, then everything that's all clear.
  const attentionItems: AttentionItem[] = [
    {
      label: "Overdue Welcome Calls",
      hint: "Pending 24+ hours",
      count: overdueCalls.count,
      href: "/dashboard/admin/overdue-welcome-calls",
      icon: PhoneCall,
      tone: "red",
    },
    {
      label: "Missed Weekly Shares",
      hint: "No share in 7+ days",
      count: missedShares.count,
      href: "/dashboard/admin/missed-weekly-shares",
      icon: Send,
      tone: "red",
    },
    {
      label: "Non-Connected Clients",
      hint: "No update in 2+ days",
      count: nonConnected.count,
      href: "/dashboard/admin/non-connected-clients",
      icon: UserX,
      tone: "red",
    },
    {
      label: "Pending Approvals",
      hint: "Profiles awaiting approval",
      count: t.pendingApprovals,
      href: "/dashboard/admin/profiles?filter=pending-approval",
      icon: ClipboardCheck,
      tone: "amber",
    },
    {
      label: "Unassigned Profiles",
      hint: "Not assigned to anyone",
      count: stats.profileAssignment.unassigned,
      href: "/dashboard/admin/profiles",
      icon: UserPlus,
      tone: "amber",
    },
    {
      label: "Pending Follow-ups",
      hint: "Leads waiting on a follow-up",
      count: stats.leads.pendingLeads,
      href: "/dashboard/admin/leads",
      icon: Clock,
      tone: "amber",
    },
  ];
  const attention = [...attentionItems].sort((a, b) => {
    const rank = (i: AttentionItem) => (i.count > 0 ? (i.tone === "red" ? 0 : 1) : 2);
    return rank(a) - rank(b);
  });
  const openCount = attention.filter((i) => i.count > 0).length;

  return (
    <div className="space-y-6">
      <DashboardHero
        title={`Welcome back, ${session?.user?.name}`}
        subtitle={`${todayLabel} · ${t.newLeadsToday} new leads · ${t.profilesCreatedToday} profiles created · ${t.meetingsToday} meetings today`}
        department="ADMIN"
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Needs Attention</h2>
          {openCount > 0 ? (
            <Badge variant="outline" className="border-red-200 bg-red-100 text-red-700">
              {openCount} need{openCount === 1 ? "s" : ""} action
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              All clear
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attention.map((item) => (
            <AttentionCard key={item.label} item={item} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Revenue Collected"
          icon={IndianRupee}
          chip="bg-emerald-50"
          iconClass="text-emerald-600"
          value={`₹${stats.payments.totalCollected.toLocaleString("en-IN")}`}
          caption={`${stats.payments.paidPayments} paid payments`}
          progress={paymentsProgress}
          subs={[
            { label: "Paid", value: stats.payments.paidPayments },
            {
              label: "Pending",
              value: stats.payments.pendingPayments,
              warn: stats.payments.pendingPayments > 0 ? "amber" : undefined,
            },
            {
              label: "Failed",
              value: stats.payments.failedPayments,
              warn: stats.payments.failedPayments > 0 ? "red" : undefined,
            },
          ]}
          href="/dashboard/admin/payments"
          hrefLabel="View Payments"
        />
        <KpiCard
          title="Ongoing Services"
          icon={Activity}
          chip="bg-blue-50"
          iconClass="text-blue-600"
          value={stats.services.activeServices}
          caption="Active services"
          progress={servicesProgress}
          subs={[
            { label: "On Hold", value: stats.services.holdServices },
            { label: "Expired", value: stats.services.expiredServices },
          ]}
          href="/dashboard/admin/ongoing-services"
          hrefLabel="View Ongoing Services"
        />
        <KpiCard
          title="Profiles"
          icon={Users}
          chip="bg-violet-50"
          iconClass="text-violet-600"
          value={stats.profiles.totalProfiles.toLocaleString("en-IN")}
          caption="Total profiles"
          subs={[
            { label: "Male", value: stats.profiles.maleProfiles },
            { label: "Female", value: stats.profiles.femaleProfiles },
          ]}
          href="/dashboard/admin/profiles"
          hrefLabel="View Profiles"
        />
        <KpiCard
          title="Team"
          icon={Network}
          chip="bg-cyan-50"
          iconClass="text-cyan-600"
          value={stats.employees.activeEmployees}
          caption={`of ${stats.employees.totalEmployees} employees active`}
          progress={employeesProgress}
          subs={[]}
          href="/dashboard/admin/employees"
          hrefLabel="Manage Staff"
        />
      </div>

      <QuickActions />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FunnelBreakdown
            title="Lead Pipeline"
            subtitle="Current lead status breakdown"
            badge="Live Overview"
            rows={funnelRows}
          />
        </div>
        <div className="flex flex-col gap-4">
          <ConversionRateCard
            rate={stats.leads.conversionRate}
            month={currentMonth}
            todaysActivityCount={stats.todaysActivityCount}
          />
          <RecentActivity items={recentActivity} />
          <NotificationsPanel items={notifications} />
        </div>
      </div>
    </div>
  );
}
