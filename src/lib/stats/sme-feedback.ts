import { prisma } from "@/lib/db/prisma";

const SERVICE_ROLES = ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"] as const;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type FeedbackEntry = {
  id: string;
  status: string | null;
  feedback: string | null;
  createdAt: Date;
  clientName: string;
  candidateName: string;
  candidateProfileCode: string;
  employeeId: string | null;
  employeeName: string | null;
};

/** Client-side feedback entries (ProfileShareFeedbackHistory, type=CLIENT)
 * from the last 30 days, joined out to the client's assigned Service
 * employee via subscription -> profile -> assignedTo. Built for the
 * SME quality-oversight "Client Feedback" tab. */
export async function getServiceFeedbackFeed(options?: { assignedToId?: string }) {
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);

  const scopedFilter = options?.assignedToId
    ? { profileShare: { subscription: { profile: { assignedToId: options.assignedToId } } } }
    : {};

  const entries = await prisma.profileShareFeedbackHistory.findMany({
    where: { type: "CLIENT", createdAt: { gte: thirtyDaysAgo }, ...scopedFilter },
    orderBy: { createdAt: "desc" },
    take: 150,
    select: {
      id: true,
      status: true,
      feedback: true,
      createdAt: true,
      profileShare: {
        select: {
          sharedProfile: { select: { name: true, profileCode: true } },
          subscription: {
            select: {
              profile: {
                select: {
                  name: true,
                  assignedToId: true,
                  assignedTo: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const feed: FeedbackEntry[] = entries.map((e) => ({
    id: e.id,
    status: e.status,
    feedback: e.feedback,
    createdAt: e.createdAt,
    clientName: e.profileShare.subscription.profile.name,
    candidateName: e.profileShare.sharedProfile.name,
    candidateProfileCode: e.profileShare.sharedProfile.profileCode,
    employeeId: e.profileShare.subscription.profile.assignedTo?.id ?? null,
    employeeName: e.profileShare.subscription.profile.assignedTo?.name ?? null,
  }));

  const totals = {
    total: feed.length,
    positive: feed.filter((f) => f.status === "ACCEPTED").length,
    negative: feed.filter((f) => f.status === "REJECTED").length,
  };

  return { feed, totals };
}

export async function getActiveServiceEmployees() {
  return prisma.user.findMany({
    where: { role: { in: [...SERVICE_ROLES] }, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
