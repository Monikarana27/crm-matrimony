import { prisma } from "@/lib/db/prisma";

export interface NotificationItem {
  id: string;
  type: "approval" | "meeting" | "target_missed";
  title: string;
  description: string;
  href: string;
  timestamp: Date;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  const pendingProfiles = await prisma.profile.findMany({
    where: { approvalStatus: "PENDING_APPROVAL", deletedAt: null },
    select: { id: true, name: true, profileCode: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const approvalNotifications: NotificationItem[] = pendingProfiles.map((p) => ({
    id: `approval-${p.id}`,
    type: "approval",
    title: "New profile awaiting approval",
    description: `${p.name} (${p.profileCode})`,
    href: "/dashboard/admin/profiles?filter=pending-approval",
    timestamp: p.createdAt,
  }));

  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      status: "SCHEDULED",
      profile: { deletedAt: null },
      scheduledAt: { gte: now, lte: oneHourFromNow },
    },
    select: {
      id: true,
      scheduledAt: true,
      profile: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 5,
  });

  const meetingNotifications: NotificationItem[] = upcomingMeetings.map((m) => ({
    id: `meeting-${m.id}`,
    type: "meeting",
    title: "Meeting in 1 hour",
    description: `${m.profile.name}${m.assignedTo ? ` with ${m.assignedTo.name}` : ""} at ${new Date(
      m.scheduledAt
    ).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`,
    href: "/dashboard/admin/meetings",
    timestamp: m.scheduledAt,
  }));

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.getMonth() + 1;
  const lastYear = lastMonthDate.getFullYear();
  const monthStart = new Date(lastYear, lastMonth - 1, 1);
  const monthEnd = new Date(lastYear, lastMonth, 1);
  const monthLabel = lastMonthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const targets = await prisma.salesTarget.findMany({
    where: { month: lastMonth, year: lastYear },
    include: { user: { select: { id: true, name: true } } },
  });

  const targetNotifications: NotificationItem[] = [];

  for (const target of targets) {
    const achieved = await prisma.payment.aggregate({
      where: {
        createdById: target.userId,
        status: "PAID",
        paidAt: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
    });

    const achievedAmount = achieved._sum.amount ?? 0;

    if (achievedAmount < target.targetAmount) {
      targetNotifications.push({
        id: `target-${target.id}`,
        type: "target_missed",
        title: "Employee target missed",
        description: `${target.user.name} achieved ₹${achievedAmount.toLocaleString(
          "en-IN"
        )} of ₹${target.targetAmount.toLocaleString("en-IN")} (${monthLabel})`,
        href: "/dashboard/admin/sales-targets",
        timestamp: monthEnd,
      });
    }
  }

  return [...approvalNotifications, ...meetingNotifications, ...targetNotifications].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}
