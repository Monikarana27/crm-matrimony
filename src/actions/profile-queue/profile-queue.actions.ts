"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { revalidatePath } from "next/cache";

export async function sendToProfileCreationAction(leadId: string) {
  const session = await auth();
  if (!session?.user) return { error: "You must be logged in." };
  if (!["SUPER_ADMIN", "ADMIN", "SALES"].includes(session.user.role)) {
    return { error: "Only Sales can send leads for profile creation." };
  }
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "This lead could not be found." };
  if (lead.status !== "INTERESTED") {
    return { error: "Please mark this lead as Interested before sending it for profile creation." };
  }
  const existing = await prisma.profileQueue.findUnique({ where: { leadId }});
  if (existing) return { error: "This lead has already been sent for profile creation." };
  const queueEntry = await prisma.profileQueue.create({
    data: { leadId, sentById: session.user.id },
  });
  await prisma.activityLog.create({
    data: { actorId: await getActingUserId(session), action: "SEND_TO_PROFILE_CREATION", entityType: "Lead", entityId: leadId },
  });
  revalidatePath("/dashboard/admin/leads");
  return { error: null };
}

export async function getProfileQueue() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN", "PROFILE_CREATOR", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return prisma.profileQueue.findMany({
    where: { status: { in: ["PENDING", "IN_PROGRESS"] }, lead: { deletedAt: null } },
    orderBy: { sentToQueueAt: "desc" },
    include: { lead: true, sentBy: { select: { id: true, name: true } } },
  });
}

export async function markQueueInProgressAction(queueId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN", "PROFILE_CREATOR", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  await prisma.profileQueue.updateMany({
    where: { id: queueId, status: "PENDING" },
    data: { status: "IN_PROGRESS" },
  });
}

export async function markQueueCompletedAction(queueId: string, profileId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN", "PROFILE_CREATOR", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  await prisma.profileQueue.update({
    where: { id: queueId },
    data: { status: "COMPLETED", createdProfileId: profileId, completedAt: new Date() },
  });
  revalidatePath("/dashboard/profile-creator");
}

export async function getProfileCreatorDashboard() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN", "PROFILE_CREATOR", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const [pending, inProgress, completedQueueToday, returnedForCorrection, directProfilesToday] = await Promise.all([
    prisma.profileQueue.findMany({
      where: { status: "PENDING", lead: { deletedAt: null } },
      orderBy: { sentToQueueAt: "desc" },
      include: { lead: true, sentBy: { select: { id: true, name: true } } },
    }),
    prisma.profileQueue.findMany({
      where: { status: "IN_PROGRESS", lead: { deletedAt: null } },
      orderBy: { sentToQueueAt: "desc" },
      include: { lead: true, sentBy: { select: { id: true, name: true } } },
    }),
    prisma.profileQueue.findMany({
      where: {
        status: "COMPLETED", lead: { deletedAt: null },
        completedAt: { gte: todayStart, lte: todayEnd },
        createdProfile: { createdById: session.user.id },
      },
      orderBy: { completedAt: "desc" },
      include: { lead: true, sentBy: { select: { id: true, name: true } } },
    }),
    prisma.profile.findMany({
      where: { deletedAt: null, approvalStatus: "NEEDS_CHANGES", createdById: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, profileCode: true, approvalNotes: true, updatedAt: true },
    }),
    prisma.profile.findMany({
      where: { deletedAt: null, queueEntry: null, createdAt: { gte: todayStart, lte: todayEnd }, createdById: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, phone: true, createdAt: true },
    }),
  ]);
  const directCompletedToday = directProfilesToday.map((p) => ({
    id: p.id,
    lead: { name: p.name, phone: p.phone },
    sentBy: null as { id: string; name: string | null } | null,
    createdProfileId: p.id as string | null,
  }));
  const completedToday = [...completedQueueToday, ...directCompletedToday];
  return { pending, inProgress, completedToday, returnedForCorrection };
}
