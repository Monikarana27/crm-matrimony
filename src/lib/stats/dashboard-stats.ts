import { prisma } from "@/lib/db/prisma";

type IdFilter = string | { in: string[] };

async function getLeadFunnel(whereIn: { assignedToId?: IdFilter } = {}) {
  const where = { ...whereIn, deletedAt: null };
  const [newLeads, contactedLeads, convertedLeads, pendingLeads, notInterestedLeads, totalLeads] =
    await Promise.all([
      prisma.lead.count({ where: { ...where, status: "NEW" } }),
      prisma.lead.count({ where: { ...where, status: "CONTACTED" }}),
      prisma.lead.count({ where: { ...where, status: "CONVERTED" }}),
      prisma.lead.count({ where: { ...where, status: "PENDING" } }),
      prisma.lead.count({ where: { ...where, status: "NOT_INTERESTED" } }),
      prisma.lead.count({ where: { ...where, deletedAt: null } }),
    ]);

  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  return {
    totalLeads,
    newLeads,
    contactedLeads,
    convertedLeads,
    pendingLeads,
    notInterestedLeads,
    conversionRate,
  };
}

async function getProfileAssignmentBreakdown(whereIn: { assignedToId?: IdFilter } = {}) {
  const where = { ...whereIn, deletedAt: null };
  const [assigned, reassigned, unassigned] = await Promise.all([
    prisma.profile.count({ where: { ...where, status: "ASSIGNED" }}),
    prisma.profile.count({ where: { ...where, status: "REASSIGNED"} }),
    prisma.profile.count({ where: { ...where, status: "UNASSIGNED"} }),
  ]);
  return { assigned, reassigned, unassigned };
}

async function getTodaysActivityCount(actorId?: IdFilter) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  return prisma.activityLog.count({
    where: {
      ...(actorId ? { actorId } : {}),
      createdAt: { gte: todayStart, lte: todayEnd },
    },
  });
}

async function getTodaysSummary() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [newLeadsToday, profilesCreatedToday, meetingsToday, pendingApprovals, activeServices] =
    await Promise.all([
      prisma.lead.count({
        where: { deletedAt: null, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.profile.count({
        where: { deletedAt: null, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.meeting.count({
        where: { profile: { deletedAt: null }, scheduledAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.profile.count({
        where: { deletedAt: null, approvalStatus: "PENDING_APPROVAL" },
      }),
      prisma.subscription.count({ where: { profile: { deletedAt: null }, status: "ACTIVE" } }),
    ]);

  return { newLeadsToday, profilesCreatedToday, meetingsToday, pendingApprovals, activeServices };
}

export async function getAdminStats() {
  const [
    funnel,
    profileAssignment,
    activeEmployees,
    totalEmployees,
    activeServices,
    holdServices,
    expiredServices,
    paidPayments,
    pendingPayments,
    failedPayments,
    faceToFaceMeetings,
    teleMeetings,
    todaysActivityCount,
    totalProfiles,
    maleProfiles,
    femaleProfiles,
    profilesOnHold,
    todaysSummary,
  ] = await Promise.all([
    getLeadFunnel(),
    getProfileAssignmentBreakdown(),
    prisma.user.count({ where: { active: true } }),
    prisma.user.count(),
    prisma.subscription.count({ where: { profile: { deletedAt: null }, status: "ACTIVE" } }),
    prisma.subscription.count({ where: { profile: { deletedAt: null }, status: "HOLD" } }),
    prisma.subscription.count({ where: { profile: { deletedAt: null }, status: "EXPIRED" } }),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.meeting.count({ where: { profile: { deletedAt: null }, type: "FACE_TO_FACE" } }),
    prisma.meeting.count({ where: { profile: { deletedAt: null }, type: "TELE" } }),
    getTodaysActivityCount(),
    prisma.profile.count({ where: { deletedAt: null } }),
    prisma.profile.count({ where: { deletedAt: null, gender: "MALE" } }),
    prisma.profile.count({ where: { deletedAt: null, gender: "FEMALE" } }),
    prisma.profile.count({ where: { deletedAt: null, status: "ON_HOLD" } }),
    getTodaysSummary(),
  ]);
  const paidAmountResult = await prisma.payment.aggregate({
    where: { status: "PAID" },
    _sum: { amount: true },
  });

  return {
    leads: funnel,
    profileAssignment,
    profiles: { totalProfiles, maleProfiles, femaleProfiles, profilesOnHold },
    employees: { activeEmployees, totalEmployees },
    services: { activeServices, holdServices, expiredServices },
    payments: {
      paidPayments,
      pendingPayments,
      failedPayments,
      totalCollected: paidAmountResult._sum.amount ?? 0,
    },
    meetings: { faceToFaceMeetings, teleMeetings },
    todaysActivityCount,
    todaysSummary,
  };
}

// Statuses that are "done" one way or another and should never count as
// pending, regardless of how stale their last remark is.
const PENDING_EXCLUDED_STATUSES: (
  | "CONVERTED"
  | "NOT_INTERESTED"
  | "CLOSED"
  | "NO_NOT_EXIST"
  | "WRONG_NUMBER_FAKE_LEAD"
)[] = ["CONVERTED", "NOT_INTERESTED", "CLOSED", "NO_NOT_EXIST", "WRONG_NUMBER_FAKE_LEAD"];

async function getPendingLeadsCount(where: { assignedToId?: IdFilter } = {}) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const leads = await prisma.lead.findMany({
    where: {
      ...where,
      deletedAt: null,
      status: { notIn: PENDING_EXCLUDED_STATUSES },
    },
    select: {
      id: true,
      createdAt: true,
      remarks: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });
  return leads.filter((lead) => {
    const lastActivity = lead.remarks[0]?.createdAt ?? lead.createdAt;
    return lastActivity < cutoff;
  }).length;
}

export async function getSalesStats(userId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    funnel,
    profileAssignment,
    todaysActivityCount,
    newLeadsToday,
    newLeadsTodayStatusNew,
    pendingLeadsCount,
    pendingLeadsToday,
    followUpsDueToday,
  ] = await Promise.all([
    getLeadFunnel({ assignedToId: userId }),
    getProfileAssignmentBreakdown({ assignedToId: userId }),
    getTodaysActivityCount(userId),
    prisma.lead.count({
      where: { assignedToId: userId, deletedAt: null, assignedAt: { gte: todayStart,lte: todayEnd } },
    }),
    prisma.lead.count({
      where: { assignedToId: userId, deletedAt: null, status: "NEW", assignedAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.lead.count({ where: { assignedToId: userId, deletedAt: null, status: "PENDING" } }),
    getPendingLeadsCount({ assignedToId: userId }),
    prisma.lead.count({
      where: { assignedToId: userId, deletedAt: null, status: { notIn: PENDING_EXCLUDED_STATUSES }, followUpDate: { lte: todayEnd } },
    }),
  ]);

  return {
    leads: funnel,
    profileAssignment,
    todaysActivityCount,
    newLeadsToday,
    newLeadsTodayStatusNew,
    pendingLeadsCount,
    myLeads: funnel.totalLeads,
    myProfiles: profileAssignment.assigned + profileAssignment.reassigned,
    todaysTasks: {
      pendingLeadsToday,
      newLeadsToday,
      followUpsDueToday,
    },
  };
}

/**
 * Same shape as getSalesStats, aggregated across an entire team
 * (an array of user IDs â€” typically the result of getTeamMemberIds).
 * Used on the Sales Manager / Sales TL dashboard's "My Team" section.
 */
export async function getTeamSalesStats(teamIds: string[]) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const idFilter = { in: teamIds };

  const [
    funnel,
    profileAssignment,
    todaysActivityCount,
    newLeadsToday,
    newLeadsTodayStatusNew,
    pendingLeadsCount,
    pendingLeadsToday,
    followUpsDueToday,
  ] = await Promise.all([
    getLeadFunnel({ assignedToId: idFilter }),
    getProfileAssignmentBreakdown({ assignedToId: idFilter }),
    getTodaysActivityCount(idFilter),
    prisma.lead.count({
      where: { deletedAt: null, assignedToId: idFilter, assignedAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.lead.count({
      where: { deletedAt: null, assignedToId: idFilter, status: "NEW", assignedAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.lead.count({ where: { deletedAt: null, assignedToId: idFilter, status: "PENDING" } }),
    getPendingLeadsCount({ assignedToId: idFilter }),
    prisma.lead.count({
      where: { assignedToId: idFilter, deletedAt: null, status: { notIn: PENDING_EXCLUDED_STATUSES }, followUpDate: { lte: todayEnd } },
    }),
  ]);

  return {
    leads: funnel,
    profileAssignment,
    todaysActivityCount,
    newLeadsToday,
    newLeadsTodayStatusNew,
    pendingLeadsCount,
    teamLeads: funnel.totalLeads,
    teamProfiles: profileAssignment.assigned + profileAssignment.reassigned,
    todaysTasks: {
      pendingLeadsToday,
      newLeadsToday,
      followUpsDueToday,
    },
  };
}

export async function getServiceStats(userId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    assignedProfiles,
    meetingsToday,
    activeServiceCount,
    onHoldProfiles,
    expiredServiceCount,
    upcomingMeetings,
    todaysActivityCount,
  ] = await Promise.all([
    prisma.profile.count({ where: { assignedToId: userId, deletedAt: null } }),
    prisma.meeting.count({
      where: {
        assignedToId: userId,
        profile: { deletedAt: null },
        scheduledAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.subscription.count({
      where: { status: "ACTIVE", profile: { assignedToId: userId, deletedAt: null } },
    }),
    prisma.profile.count({ where: { assignedToId: userId, deletedAt: null, status: "ON_HOLD" } }),
    prisma.subscription.count({
      where: { status: "EXPIRED", profile: { assignedToId: userId, deletedAt: null } },
    }),
    prisma.meeting.findMany({
      where: {
        assignedToId: userId,
        profile: { deletedAt: null },
        scheduledAt: { gte: todayStart },
        status: "SCHEDULED",
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { profile: { select: { name: true } } },
    }),
    getTodaysActivityCount(userId),
  ]);

  const leadFunnel = await getLeadFunnel({ assignedToId: userId });

  return {
    assignedProfiles,
    meetingsToday,
    activeServiceCount,
    onHoldProfiles,
    expiredServiceCount,
    upcomingMeetings,
    todaysActivityCount,
    leads: leadFunnel,
    myLeads: leadFunnel.totalLeads,
  };
}

/**
 * Same shape as getServiceStats, aggregated across an entire team.
 * Used on the Service Manager / Service TL dashboard's "My Team" section.
 */
export async function getTeamServiceStats(teamIds: string[]) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const idFilter = { in: teamIds };

  const [
    assignedProfiles,
    meetingsToday,
    activeServiceCount,
    onHoldProfiles,
    expiredServiceCount,
    upcomingMeetings,
    todaysActivityCount,
  ] = await Promise.all([
    prisma.profile.count({ where: { deletedAt: null, assignedToId: idFilter } }),
    prisma.meeting.count({
      where: { profile: { deletedAt: null },
        assignedToId: idFilter,
        scheduledAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.subscription.count({
      where: { status: "ACTIVE", profile: { deletedAt: null, assignedToId: idFilter } },
    }),
    prisma.profile.count({ where: { deletedAt: null, assignedToId: idFilter, status: "ON_HOLD" } }),
    prisma.subscription.count({
      where: { status: "EXPIRED", profile: { deletedAt: null, assignedToId: idFilter } },
    }),
    prisma.meeting.findMany({
      where: { profile: { deletedAt: null },
        assignedToId: idFilter,
        scheduledAt: { gte: todayStart },
        status: "SCHEDULED",
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { profile: { select: { name: true } } },
    }),
    getTodaysActivityCount(idFilter),
  ]);

  const leadFunnel = await getLeadFunnel({ assignedToId: idFilter });

  return {
    assignedProfiles,
    meetingsToday,
    activeServiceCount,
    onHoldProfiles,
    expiredServiceCount,
    upcomingMeetings,
    todaysActivityCount,
    leads: leadFunnel,
    teamLeads: leadFunnel.totalLeads,
  };
}

export async function getRecentActivity(limit = 10) {
  const logs = await prisma.activityLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });

  return logs.map((log) => ({
    id: log.id,
    actorName: log.actor.name,
    action: log.action,
    entityType: log.entityType,
    createdAt: log.createdAt,
  }));
}

export async function getOrgSalesStats() {
  const salesEmployees = await prisma.user.findMany({
    where: { role: { in: ["SALES", "SALES_TL", "SALES_MANAGER"] }, active: true },
    select: { id: true },
  });
  return getTeamSalesStats(salesEmployees.map((e) => e.id));
}

export async function getOrgServiceStats() {
  const serviceEmployees = await prisma.user.findMany({
    where: { role: { in: ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"] }, active: true },
    select: { id: true },
  });
  return getTeamServiceStats(serviceEmployees.map((e) => e.id));
}

export async function getOrgNewLeadsBreakdown() {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayEnd); yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [today, yesterday, thisMonth] = await Promise.all([
    prisma.lead.count({ where: { deletedAt: null, createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.lead.count({ where: { deletedAt: null, createdAt: { gte: yesterdayStart, lte: yesterdayEnd } } }),
    prisma.lead.count({ where: { deletedAt: null, createdAt: { gte: monthStart } } }),
  ]);

  return { today, yesterday, thisMonth };
}

export async function getOrgLeadPipeline() {
  const [newLead, contacted, interested, followUp, converted, lost, total] = await Promise.all([
    prisma.lead.count({ where: { deletedAt: null, status: "NEW" } }),
    prisma.lead.count({ where: { deletedAt: null, status: "CONTACTED" } }),
    prisma.lead.count({ where: { deletedAt: null, status: "INTERESTED" } }),
    prisma.lead.count({ where: { deletedAt: null, status: "PENDING" } }),
    prisma.lead.count({ where: { deletedAt: null, status: "CONVERTED" } }),
    prisma.lead.count({ where: { deletedAt: null, status: "NOT_INTERESTED" } }),
    prisma.lead.count({ where: { deletedAt: null } }),
  ]);

  return { newLead, contacted, interested, followUp, converted, lost, total };
}

export async function getDailySalesReport(date: Date) {
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

  const salesEmployees = await prisma.user.findMany({
    where: { role: { in: ["SALES", "SALES_TL", "SALES_MANAGER"] }, active: true },
    select: { id: true, name: true },
  });

  const rows = await Promise.all(
    salesEmployees.map(async (emp) => {
      const [leadsAssigned, remarkCalls, callLogCalls, meetingsScheduled, conversions, revenueResult] =
        await Promise.all([
          prisma.lead.count({ where: { deletedAt: null, assignedToId: emp.id, createdAt: { gte: dayStart, lte: dayEnd } } }),
          prisma.leadRemark.count({ where: { actorId: emp.id, createdAt: { gte: dayStart, lte: dayEnd } } }),
          prisma.callLog.count({ where: { createdById: emp.id, calledAt: { gte: dayStart, lte: dayEnd } } }),
          prisma.meeting.count({ where: { profile: { deletedAt: null }, assignedToId: emp.id, createdAt: { gte: dayStart, lte: dayEnd } } }),
          prisma.lead.count({ where: { deletedAt: null, assignedToId: emp.id, status: "CONVERTED", updatedAt: { gte: dayStart, lte: dayEnd } } }),
          prisma.payment.aggregate({
            where: {
              status: "PAID",
              paidAt: { gte: dayStart, lte: dayEnd },
              subscription: { profile: { assignedToId: emp.id } },
            },
            _sum: { amount: true },
          }),
        ]);

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        leadsAssigned,
        callsMade: remarkCalls + callLogCalls,
        meetingsScheduled,
        conversions,
        revenue: revenueResult._sum.amount ?? 0,
      };
    })
  );

  return rows;
}

export async function getMonthlySalesReport(month: number, year: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const salesEmployees = await prisma.user.findMany({
    where: { role: { in: ["SALES", "SALES_TL", "SALES_MANAGER"] }, active: true },
    select: { id: true, name: true },
  });

  const rows = await Promise.all(
    salesEmployees.map(async (emp) => {
      const [leadsAssigned, remarkCalls, callLogCalls, meetingsScheduled, conversions, revenueResult] =
        await Promise.all([
          prisma.lead.count({ where: { deletedAt: null, assignedToId: emp.id, createdAt: { gte: monthStart, lte: monthEnd } } }),
          prisma.leadRemark.count({ where: { actorId: emp.id, createdAt: { gte: monthStart, lte: monthEnd } } }),
          prisma.callLog.count({ where: { createdById: emp.id, calledAt: { gte: monthStart, lte: monthEnd } } }),
          prisma.meeting.count({ where: { profile: { deletedAt: null }, assignedToId: emp.id, createdAt: { gte: monthStart, lte: monthEnd } } }),
          prisma.lead.count({ where: { deletedAt: null, assignedToId: emp.id, status: "CONVERTED", updatedAt: { gte: monthStart, lte: monthEnd } } }),
          prisma.payment.aggregate({
            where: {
              status: "PAID",
              paidAt: { gte: monthStart, lte: monthEnd },
              subscription: { profile: { assignedToId: emp.id } },
            },
            _sum: { amount: true },
          }),
        ]);

      const conversionPct = leadsAssigned > 0 ? (conversions / leadsAssigned) * 100 : 0;

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        leadsAssigned,
        callsMade: remarkCalls + callLogCalls,
        meetingsScheduled,
        conversions,
        conversionPct,
        revenue: revenueResult._sum.amount ?? 0,
      };
    })
  );

  return rows;
}

export async function getOrgLeadTrend(days = 7) {
  const results = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);

    const [newLeads, converted] = await Promise.all([
      prisma.lead.count({ where: { deletedAt: null, createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.lead.count({ where: { deletedAt: null, status: "CONVERTED", updatedAt: { gte: dayStart, lte: dayEnd } } }),
    ]);

    results.push({
      date: dayStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      newLeads,
      converted,
    });
  }
  return results;
}

export async function getOwnerSummary() {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sevenDaysOut = new Date(now); sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

  const [
    newLeadsToday,
    revenueToday,
    activeClients,
    onHoldClients,
    meetingsToday,
    profilesSharedToday,
    pendingPayments,
    expiringServices,
    successStoriesThisMonth,
  ] = await Promise.all([
    prisma.lead.count({ where: { deletedAt: null, createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: todayStart, lte: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.subscription.count({ where: { profile: { deletedAt: null }, status: "ACTIVE" } }),
    prisma.subscription.count({ where: { profile: { deletedAt: null }, status: "HOLD" } }),
    prisma.meeting.count({ where: { profile: { deletedAt: null }, scheduledAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.profileShare.count({ where: { sharedAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.subscription.count({
      where: { profile: { deletedAt: null }, status: "ACTIVE", endDate: { gte: now, lte: sevenDaysOut } },
    }),
    prisma.successStory.count({ where: { closedAt: { gte: monthStart } } }),
  ]);

  return {
    newLeadsToday,
    revenueToday: revenueToday._sum.amount ?? 0,
    activeClients,
    onHoldClients,
    meetingsToday,
    profilesSharedToday,
    pendingPayments,
    expiringServices,
    successStoriesThisMonth,
  };
}

export async function getServiceOverview() {
  const now = new Date();
  const sevenDaysOut = new Date(now); sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const thirtyDaysOut = new Date(now); thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

  const [
    active,
    onHold,
    meetingStage,
    marriageFixed,
    familyDiscussion,
    successClosed,
    expiringIn7,
    expiringIn30,
    expired,
  ] = await Promise.all([
    prisma.subscription.count({ where: { profile: { deletedAt: null }, serviceStage: "ACTIVE" } }),
    prisma.subscription.count({ where: { profile: { deletedAt: null }, serviceStage: "ON_HOLD" } }),
    prisma.subscription.count({ where: { profile: { deletedAt: null }, serviceStage: "MEETING_STAGE" } }),
    prisma.subscription.count({ where: { profile: { deletedAt: null }, serviceStage: "MARRIAGE_FIXED" } }),
    prisma.subscription.count({ where: { profile: { deletedAt: null }, serviceStage: "FAMILY_DISCUSSION" } }),
    prisma.subscription.count({ where: { profile: { deletedAt: null }, serviceStage: "SUCCESS_CLOSED" } }),
    prisma.subscription.count({
      where: { profile: { deletedAt: null }, status: "ACTIVE", endDate: { gte: now, lte: sevenDaysOut } },
    }),
    prisma.subscription.count({
      where: { profile: { deletedAt: null }, status: "ACTIVE", endDate: { gte: now, lte: thirtyDaysOut } },
    }),
    prisma.subscription.count({ where: { profile: { deletedAt: null }, status: "EXPIRED" } }),
  ]);

  return {
    stages: { active, onHold, meetingStage, marriageFixed, familyDiscussion, successClosed },
    expiring: { in7Days: expiringIn7, in30Days: expiringIn30, expired },
  };
}

export async function getDailyServiceReport(date: Date) {
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

  const serviceEmployees = await prisma.user.findMany({
    where: { role: { in: ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"] }, active: true },
    select: { id: true, name: true },
  });

  return Promise.all(
    serviceEmployees.map(async (emp) => {
      const [profilesShared, welcomeCalls, meetingsScheduled, meetingsCompleted, shortlists] =
        await Promise.all([
          prisma.profileShare.count({ where: { sharedById: emp.id, sharedAt: { gte: dayStart, lte: dayEnd } } }),
          prisma.callLog.count({ where: { createdById: emp.id, calledAt: { gte: dayStart, lte: dayEnd } } }),
          prisma.meeting.count({ where: { profile: { deletedAt: null }, assignedToId: emp.id, createdAt: { gte: dayStart, lte: dayEnd } } }),
          prisma.meeting.count({ where: { profile: { deletedAt: null }, assignedToId: emp.id, status: "COMPLETED", scheduledAt: { gte: dayStart, lte: dayEnd } } }),
          prisma.profileShare.count({ where: { sharedById: emp.id, shortlisted: true, shortlistedAt: { gte: dayStart, lte: dayEnd } } }),
        ]);

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        profilesShared,
        welcomeCalls,
        meetingsScheduled,
        meetingsCompleted,
        shortlists,
      };
    })
  );
}

export async function getMonthlyServiceReport(month: number, year: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const serviceEmployees = await prisma.user.findMany({
    where: { role: { in: ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"] }, active: true },
    select: { id: true, name: true },
  });

  return Promise.all(
    serviceEmployees.map(async (emp) => {
      const [profilesShared, welcomeCalls, meetingsConducted, shortlists, engagementCases, marriageClosures] =
        await Promise.all([
          prisma.profileShare.count({ where: { sharedById: emp.id, sharedAt: { gte: monthStart, lte: monthEnd } } }),
          prisma.callLog.count({ where: { createdById: emp.id, calledAt: { gte: monthStart, lte: monthEnd } } }),
          prisma.meeting.count({ where: { profile: { deletedAt: null }, assignedToId: emp.id, status: "COMPLETED", scheduledAt: { gte: monthStart, lte: monthEnd } } }),
          prisma.profileShare.count({ where: { sharedById: emp.id, shortlisted: true, shortlistedAt: { gte: monthStart, lte: monthEnd } } }),
          prisma.successStory.count({
            where: { type: "ENGAGEMENT", closedAt: { gte: monthStart, lte: monthEnd }, subscription: { profile: { assignedToId: emp.id } } },
          }),
          prisma.successStory.count({
            where: { type: "MARRIAGE", closedAt: { gte: monthStart, lte: monthEnd }, subscription: { profile: { assignedToId: emp.id } } },
          }),
        ]);

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        profilesShared,
        welcomeCalls,
        meetingsConducted,
        shortlists,
        engagementCases,
        marriageClosures,
      };
    })
  );
}

export async function getSalesNeedsAttention() {
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const threeDaysAgo = new Date(now); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const overdueBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000); // welcome call overdue = still PENDING 24h+ (matches Overdue page)

  const [unassignedLeads, overdueFollowUps, stalePendingApproval, overdueWelcomeCalls] = await Promise.all([
    prisma.lead.count({ where: { deletedAt: null, assignedToId: null } }),
    prisma.lead.count({
      where: { deletedAt: null,
        followUpDate: { lt: startOfToday },
        status: { notIn: PENDING_EXCLUDED_STATUSES },
      },
    }),
    prisma.profile.count({
      where: { deletedAt: null, approvalStatus: "PENDING_APPROVAL", createdAt: { lte: threeDaysAgo } },
    }),
    prisma.welcomeCall.count({
      where: {
        status: "PENDING",
        createdAt: { lte: overdueBefore },
        assignedTo: { role: { in: ["SALES", "SALES_TL", "SALES_MANAGER"] } },
      },
    }),
  ]);

  return [
    { label: "Unassigned Leads", count: unassignedLeads, href: "/dashboard/admin/leads", tone: "warning" as const },
    { label: "Overdue Follow-ups", count: overdueFollowUps, href: "/dashboard/admin/leads", tone: "danger" as const },
    { label: "Profiles Pending Approval (3+ days)", count: stalePendingApproval, href: "/dashboard/admin/profile-approvals", tone: "warning" as const },
    { label: "Welcome Calls Overdue", count: overdueWelcomeCalls, href: "/dashboard/welcome-calls?department=SALES&status=PENDING", tone: "warning" as const },
  ];
}

export async function getServiceNeedsAttention() {
  const now = new Date();
  const sevenDaysOut = new Date(now); sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const overdueBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000); // welcome call overdue = still PENDING 24h+ (matches Overdue page)

  const [expiringSoon, onHold, pendingPayments, overdueWelcomeCalls] = await Promise.all([
    prisma.subscription.count({
      where: { profile: { deletedAt: null }, status: "ACTIVE", endDate: { gte: now, lte: sevenDaysOut } },
    }),
    prisma.subscription.count({ where: { profile: { deletedAt: null }, status: "HOLD" } }),
    prisma.payment.count({ where: { status: "PENDING", subscription: { profile: { deletedAt: null } } } }),
    prisma.welcomeCall.count({
      where: {
        status: "PENDING",
        createdAt: { lte: overdueBefore },
        assignedTo: { role: { in: ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"] } },
      },
    }),
  ]);

  void overdueWelcomeCalls; // now shown as its own highlighted card on the Service dashboard
  return [
    { label: "Expiring in 7 Days", count: expiringSoon, href: "/dashboard/admin/subscriptions/expiring", tone: "danger" as const },
    { label: "Clients On Hold", count: onHold, href: "/dashboard/admin/subscriptions", tone: "warning" as const },
    { label: "Pending Payments", count: pendingPayments, href: "/dashboard/admin/payments", tone: "warning" as const },
  ];
}