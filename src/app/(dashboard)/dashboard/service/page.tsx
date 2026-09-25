import { auth } from "@/lib/auth/auth";
import { ensureFollowUpNotifications } from "@/actions/leads/lead.actions";
import { StatWidget } from "@/components/widgets/stat-widget";
import { DashboardHero, heroVariantForRole } from "@/components/layout/dashboard-hero";
import { getServiceStats, getTeamServiceStats } from "@/lib/stats/dashboard-stats";
import { getMyTarget, getTeamSalesTargetsForMonth } from "@/actions/sales-targets/sales-target.actions";
import { getTeamMemberIds } from "@/lib/hierarchy/team";
import { getServiceQualityRollup } from "@/lib/stats/sme-rollup";
import { getServiceFeedbackFeed, getActiveServiceEmployees } from "@/lib/stats/sme-feedback";
import { DashboardTabs } from "@/components/layout/dashboard-tabs";
import { SmeQualityView } from "@/components/sme/sme-quality-view";
import { SmeFeedbackFeed } from "@/components/sme/sme-feedback-feed";
import { SmeFollowUpTab } from "@/components/sme/sme-follow-up-tab";
import { SmeClientCallsTab } from "@/components/sme/sme-client-calls-tab";
import { MyFollowUps } from "@/components/sme/my-follow-ups";
import { MyRating } from "@/components/sme/my-rating";
import { getServiceWelcomeCallSummary } from "@/lib/stats/welcome-call-summary";
import { WelcomeCallsHighlight } from "@/components/widgets/welcome-calls-highlight";
import { SalesTargetsGrid } from "@/components/shared/sales-targets-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarClock,
  PhoneCall,
  Users,
  UserSquare2,
  Activity,
  AlertTriangle,
  Handshake,
  UserPlus,
  CheckCircle2,
  Clock,
} from "lucide-react";

const SERVICE_TEAM_ROLES = ["SERVICE_TL", "SERVICE_MANAGER"];

export default async function ServiceDashboardPage() {
  const session = await auth();
  await ensureFollowUpNotifications();
  const stats = await getServiceStats(session!.user.id);
  const welcomeCalls = await getServiceWelcomeCallSummary(session!.user.id, session!.user.role);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const myTarget = await getMyTarget(currentMonth, currentYear);
  const targetPct =
    myTarget.targetAmount && myTarget.targetAmount > 0
      ? Math.min((myTarget.achievedAmount / myTarget.targetAmount) * 100, 100)
      : 0;
  const remaining = myTarget.targetAmount
    ? Math.max(myTarget.targetAmount - myTarget.achievedAmount, 0)
    : 0;

  const quickActions = [
    { label: "Assigned Profiles", href: "/dashboard/service/profiles", color: "bg-blue-500" },
    { label: "Meetings", href: "/dashboard/admin/meetings", color:"bg-cyan-500" },
    { label: "Welcome Calls", href: "/dashboard/service/welcome-calls", color: "bg-emerald-500" },
    { label: "Service Status", href: "/dashboard/admin/subscriptions", color: "bg-amber-500" },
  ];

  const isTeamRole = SERVICE_TEAM_ROLES.includes(session!.user.role);
  let teamIds: string[] = [];
  let teamStats: Awaited<ReturnType<typeof getTeamServiceStats>> | null = null;
  let teamTargets: Awaited<ReturnType<typeof getTeamSalesTargetsForMonth>> = [];

  if (isTeamRole) {
    teamIds = await getTeamMemberIds(session!.user.id);
    teamStats = await getTeamServiceStats(teamIds);
    teamTargets = await getTeamSalesTargetsForMonth(currentMonth, currentYear);
  }

  const myTeamContent = (
    <div className="space-y-6">
      <DashboardHero
        title={`Welcome back, ${session?.user?.name}`}
        subtitle="Here's your service activity for today."
        variant={heroVariantForRole(session!.user.role)}
        department="SERVICE"
        extraBadge={session!.user.isSME ? "+SME" : undefined}
      />

      <WelcomeCallsHighlight summary={welcomeCalls} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatWidget
          title="Assigned Profiles"
          icon={UserSquare2}
          accentColor="blue"
          lines={[{ label: "Assigned to Me", value: stats.assignedProfiles }]}
          actionLabel="View Profiles"
          actionHref="/dashboard/service/profiles"
        />
        <StatWidget
          title="Meetings Today"
          icon={CalendarClock}
          accentColor="cyan"
          lines={[{ label: "Scheduled Today", value: stats.meetingsToday }]}
          actionLabel="View Meetings"
          actionHref="/dashboard/admin/meetings"
        />
        <StatWidget
          title="Ongoing Services"
          icon={Activity}
          accentColor="emerald"
          lines={[{ label: "Active", value: stats.activeServiceCount }]}
          actionLabel="View Subscriptions"
          actionHref="/dashboard/admin/subscriptions"
        />
        <StatWidget
          title="Needs Attention"
          icon={AlertTriangle}
          accentColor="amber"
          lines={[
            { label: "On Hold", value: stats.onHoldProfiles },
            { label: "Expired", value: stats.expiredServiceCount },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatWidget
          title="My Leads"
          icon={Handshake}
          accentColor="violet"
          lines={[{ label: "Total", value: stats.myLeads }]}
          actionLabel="View Leads"
          actionHref="/dashboard/admin/leads"
        />
        <StatWidget
          title="New Leads"
          icon={UserPlus}
          accentColor="blue"
          lines={[{ label: "New", value: stats.leads.newLeads }]}
        />
        <StatWidget
          title="Converted Leads"
          icon={CheckCircle2}
          accentColor="emerald"
          lines={[{ label: "Converted", value: stats.leads.convertedLeads }]}
        />
        <StatWidget
          title="Pending Follow-ups"
          icon={Clock}
          accentColor="amber"
          lines={[{ label: "Pending", value: stats.leads.pendingLeads }]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-blue-600" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.upcomingMeetings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming meetings scheduled.
              </p>
            ) : (
              stats.upcomingMeetings.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{m.profile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(m.scheduledAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <span className="text-xs uppercase text-muted-foreground">{m.type.replace("_", " ")}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <PhoneCall className="h-4 w-4 text-emerald-600" />
              Today's Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{stats.todaysActivityCount}</p>
            <p className="text-sm text-muted-foreground">actions logged today</p>
          </CardContent>
        </Card>
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
                  My Target — {monthLabel}
                </p>
                <p className="font-display text-2xl font-bold">{session?.user?.name}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-primary-foreground">
                <div>
                  <p className="text-xs text-primary-foreground/70">Target</p>
                  <p className="font-semibold tabular-nums">
                    ₹{myTarget.targetAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/70">Achieved</p>
                  <p className="font-semibold tabular-nums">
                    ₹{myTarget.achievedAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/70">Remaining</p>
                  <p className="font-semibold tabular-nums">₹{remaining.toLocaleString("en-IN")}</p>
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
            className={`${action.color} flex h-11 items-center justify-center rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90`}
          >
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
                  title="Team Assigned Profiles"
                  icon={UserSquare2}
                  accentColor="blue"
                  lines={[{ label: "Assigned to Team", value: teamStats!.assignedProfiles }]}
                />
                <StatWidget
                  title="Team Meetings Today"
                  icon={CalendarClock}
                  accentColor="cyan"
                  lines={[{ label: "Scheduled Today", value: teamStats!.meetingsToday }]}
                />
                <StatWidget
                  title="Team Ongoing Services"
                  icon={Activity}
                  accentColor="emerald"
                  lines={[{ label: "Active", value: teamStats!.activeServiceCount }]}
                />
                <StatWidget
                  title="Team Needs Attention"
                  icon={AlertTriangle}
                  accentColor="amber"
                  lines={[
                    { label: "On Hold", value: teamStats!.onHoldProfiles },
                    { label: "Expired", value: teamStats!.expiredServiceCount },
                  ]}
                />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  Team Targets {monthLabel}
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

  const withFollowUps = (
    <>
      <MyRating />
      <MyFollowUps />
      {myTeamContent}
    </>
  );

  if (!session!.user.isSME) {
    return withFollowUps;
  }

  const ownTeamSet = new Set([session!.user.id, ...teamIds]);
  const [rollupRows, { feed }, smeEmployees] = await Promise.all([
    getServiceQualityRollup(),
    getServiceFeedbackFeed(),
    getActiveServiceEmployees(),
  ]);
  const qualityRows = rollupRows.map((r) => ({
    ...r,
    isOwnTeam: ownTeamSet.has(r.employeeId),
  }));

  return (
    <DashboardTabs
      tabs={[
        { label: "My Team", content: withFollowUps },
        { label: "Org-Wide Quality", content: <SmeQualityView rows={qualityRows} /> },
        { label: "Client Feedback", content: <SmeFeedbackFeed feed={feed} employees={smeEmployees} /> },
        { label: "Follow-ups", content: <SmeFollowUpTab /> },
        { label: "Client Calls", content: <SmeClientCallsTab /> },
      ]}
    />
  );
}