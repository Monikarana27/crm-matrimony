import { auth } from "@/lib/auth/auth";
import Link from "next/link";
import { StatWidget } from "@/components/widgets/stat-widget";
import { FunnelBreakdown } from "@/components/widgets/funnel-breakdown";
import { ConversionRateCard } from "@/components/widgets/conversion-rate-card";
import { DashboardHero, heroVariantForRole } from "@/components/layout/dashboard-hero";
import { getSalesStats, getTeamSalesStats } from "@/lib/stats/dashboard-stats";
import { getMyTarget, getTeamSalesTargetsForMonth } from "@/actions/sales-targets/sales-target.actions";
import { getTeamMemberIds } from "@/lib/hierarchy/team";
import { SalesTargetsGrid } from "@/components/shared/sales-targets-grid";
import { Card, CardContent } from "@/components/ui/card";
import { ensureFollowUpNotifications } from "@/actions/leads/lead.actions";
import { Clock, UserPlus, PhoneCall, Users, ChevronRight } from "lucide-react";

const SALES_TEAM_ROLES = ["SALES_TL", "SALES_MANAGER"];

export default async function SalesDashboardPage() {
  const session = await auth();
  const stats = await getSalesStats(session!.user.id);
  await ensureFollowUpNotifications();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const myTarget = await getMyTarget(currentMonth, currentYear);

  const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const targetPct =
    myTarget.targetAmount && myTarget.targetAmount > 0
      ? Math.min((myTarget.achievedAmount / myTarget.targetAmount)* 100, 100)
      : 0;
  const remaining = myTarget.targetAmount
    ? Math.max(myTarget.targetAmount - myTarget.achievedAmount, 0)
    : 0;

  const funnelTotal = stats.leads.totalLeads;

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
  ];

  const quickActions = [
    { label: "Call New Leads", href: "/dashboard/admin/leads?status=NEW", color: "bg-blue-500" },
    { label: "Contacted Leads", href: "/dashboard/admin/leads?status=CONTACTED", color: "bg-cyan-500" },
    { label: "View Converted", href: "/dashboard/admin/leads?status=CONVERTED", color: "bg-emerald-500" },
    { label: "Pending Follow-ups", href: "/dashboard/admin/leads?status=PENDING", color: "bg-amber-500" },
  ];

  const isTeamRole = SALES_TEAM_ROLES.includes(session!.user.role);
  let teamIds: string[] = [];
  let teamStats: Awaited<ReturnType<typeof getTeamSalesStats>> | null = null;
  let teamTargets: Awaited<ReturnType<typeof getTeamSalesTargetsForMonth>> = [];

  if (isTeamRole) {
    teamIds = await getTeamMemberIds(session!.user.id);
    teamStats = await getTeamSalesStats(teamIds);
    teamTargets = await getTeamSalesTargetsForMonth(currentMonth, currentYear);
  }

  return (
    <div className="space-y-6">
      <DashboardHero
        title={`Welcome back, ${session?.user?.name}`}
        subtitle="Track your leads, conversions, and follow-ups."
        variant={heroVariantForRole(session!.user.role)}
        department="SALES"
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-base font-semibold">Today's Tasks</h3>
              <p className="text-sm text-muted-foreground">Quick view of today's important sales work</p>
            </div>
            <span className="text-xs rounded-full bg-muted px-3 py-1 text-muted-foreground">
              {now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
            <Link
              href="/dashboard/admin/leads?pending=stale"
              className="group relative flex items-center justify-between overflow-hidden rounded-lg border bg-card p-4 pl-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
              <div>
                <p className="font-display text-3xl font-bold tabular-nums leading-none">
                  {stats.todaysTasks.pendingLeadsToday}
                </p>
                <p className="mt-1.5 text-sm font-medium">Pending Leads</p>
                <p className="text-xs text-muted-foreground">No activity in 24+ hrs</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Clock className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/60 group-hover:translate-x-0.5" />
              </div>
            </Link>
            <Link
              href="/dashboard/admin/leads?created=today"
              className="group relative flex items-center justify-between overflow-hidden rounded-lg border bg-card p-4 pl-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
              <div>
                <p className="font-display text-3xl font-bold tabular-nums leading-none">
                  {stats.todaysTasks.newLeadsToday}
                </p>
                <p className="mt-1.5 text-sm font-medium">New Leads Today</p>
                <p className="text-xs text-muted-foreground">{stats.myLeads} total assigned</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <UserPlus className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/60 group-hover:translate-x-0.5" />
              </div>
            </Link>
            <Link
              href="/dashboard/admin/leads?followup=today"
              className="group relative flex items-center justify-between overflow-hidden rounded-lg border bg-card p-4 pl-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
              <div>
                <p className="font-display text-3xl font-bold tabular-nums leading-none">
                  {stats.todaysTasks.followUpsDueToday}
                </p>
                <p className="mt-1.5 text-sm font-medium">Follow-ups Due</p>
                <p className="text-xs text-muted-foreground">Calls/ reminders due</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/60 group-hover:translate-x-0.5" />
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatWidget
          title="Total Leads"
          lines={[{ label: "All Leads", value: stats.myLeads }]}
          actionLabel="View Leads"
          actionHref="/dashboard/admin/leads"
        />
        <StatWidget
          title="Converted Leads"
          lines={[{ label: "This Total", value: stats.leads.convertedLeads }]}
          actionLabel="View Leads"
          actionHref="/dashboard/admin/leads?status=CONVERTED"
        />
        <StatWidget
          title="New Leads"
          lines={[{ label: "This Total", value: stats.leads.newLeads }]}
          caption={`${stats.newLeadsTodayStatusNew} today`}
          actionLabel="View Leads"
          actionHref="/dashboard/admin/leads?status=NEW&created=today"
        />
        <StatWidget
          title="My Profiles"
          lines={[{ label: "Total", value: stats.myProfiles }]}
          actionLabel="View Profiles"
          actionHref="/dashboard/admin/profiles"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FunnelBreakdown
            title="Lead Pipeline"
            subtitle="Current lead status breakdown"
            badge="Live Overview"
            rows={funnelRows}
          />
        </div>
        <ConversionRateCard
          rate={stats.leads.conversionRate}
          month={monthLabel}
          todaysActivityCount={stats.todaysActivityCount}
        />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="bg-gradient-to-br from-primary to-[oklch(0.22_0.08_275)] p-6">
          {myTarget.targetAmount === null ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-primary-foreground/90">
              <p className="text-lg font-semibold">No target assigned to you for {monthLabel}</p>
              <p className="text-sm text-primary-foreground/70">
                Contact your admin to assign a monthly target.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div className="text-primary-foreground">
                <p className="text-xs uppercase tracking-wide text-primary-foreground/70">
                  My Target â€” {monthLabel}
                </p>
                <p className="font-display text-2xl font-bold">{session?.user?.name}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-primary-foreground">
                <div>
                  <p className="text-xs text-primary-foreground/70">Target</p>
                  <p className="font-semibold tabular-nums">
                    â‚¹{myTarget.targetAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/70">Achieved</p>
                  <p className="font-semibold tabular-nums">
                    â‚¹{myTarget.achievedAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/70">Remaining</p>
                  <p className="font-semibold tabular-nums">â‚¹{remaining.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-accent text-accent">
                <span className="text-sm font-bold">{targetPct.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {quickActions.map((action) => (
          <a
            key={action.label}
            href={action.href}
            className={`${action.color} flex h-11 items-center justify-center rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90`}>
            {action.label}
          </a>
        ))}
      </div>

      {isTeamRole && (
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">My Team</h2>
          </div>

          {teamIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don't have any team members assigned yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatWidget
                  title="Team Leads"
                  lines={[{ label: "All Team Leads", value: teamStats!.teamLeads }]}
                />
                <StatWidget
                  title="Team Converted"
                  lines={[{ label: "This Total", value: teamStats!.leads.convertedLeads }]}
                />
                <StatWidget
                  title="Team New Leads Today"
                  lines={[{ label: "Today", value: teamStats!.newLeadsToday }]}
                />
                <StatWidget
                  title="Team Follow-ups Due"
                  lines={[{ label: "Due Today", value: teamStats!.todaysTasks.followUpsDueToday }]}
                />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  Team Targets â€” {monthLabel}
                </h3>
                <SalesTargetsGrid
  targets={teamTargets}
  selectedMonth={currentMonth}
  selectedYear={currentYear}
  isImpersonating={!!session!.user.impersonating}
/>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}