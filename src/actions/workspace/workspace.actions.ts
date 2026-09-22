"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function getWorkspaceFeed(cursor?: string) {
  await requireAuth();

  return prisma.workspaceMessage.findMany({
    where: { parentId: null },
    orderBy: [{ isImportant: "desc" }, { createdAt: "desc" }],
    take: 30,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      author: { select: { id: true, name: true } },
      attachments: true,
      mentions: { include: { mentionedUser: { select: { id: true, name: true } } } },
      _count: { select: { replies: true } },
    },
  });
}

export async function getMessageReplies(messageId: string) {
  await requireAuth();
  return prisma.workspaceMessage.findMany({
    where: { parentId: messageId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true } },
      attachments: true,
      mentions: { include: { mentionedUser: { select: { id: true, name: true } } } },
    },
  });
}

export async function createMessageAction(input: {
  content: string;
  parentId?: string;
  mentionedUserIds: string[];
  attachments: { type: "LEAD" | "PROFILE" | "MEETING" | "PAYMENT" | "SUBSCRIPTION"; recordId: string; label: string }[];
}) {
  const session = await requireAuth();

  if (!input.content.trim()) {
    return { error: "Message cannot be empty." };
  }

  const message = await prisma.workspaceMessage.create({
    data: {
      authorId: session.user.id,
      content: input.content,
      parentId: input.parentId || null,
      mentions: {
        create: input.mentionedUserIds.map((userId) => ({ mentionedUserId: userId })),
      },
      attachments: {
        create: input.attachments.map((a) => ({ type: a.type, recordId: a.recordId, label: a.label })),
      },
    },
    include: { author: { select: { name: true } } },
  });

  const notifications: { recipientId: string; type: "MENTION" | "REPLY"; messageId: string; actorId: string; content: string }[] = [];

  for (const userId of input.mentionedUserIds) {
    if (userId === session.user.id) continue;
    notifications.push({
      recipientId: userId,
      type: "MENTION",
      messageId: message.id,
      actorId: session.user.id,
      content: `${message.author.name} mentioned you`,
    });
  }

  if (input.parentId) {
    const parent = await prisma.workspaceMessage.findUnique({
      where: { id: input.parentId },
      select: { authorId: true },
    });
    if (parent && parent.authorId !== session.user.id && !input.mentionedUserIds.includes(parent.authorId)) {
      notifications.push({
        recipientId: parent.authorId,
        type: "REPLY",
        messageId: message.id,
        actorId: session.user.id,
        content: `${message.author.name} replied to your message`,
      });
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  revalidatePath("/dashboard/workspace");
  return { error: null, messageId: message.id };
}

export async function toggleImportantAction(messageId: string) {
  const session = await requireAuth();

  const message = await prisma.workspaceMessage.findUnique({ where: { id: messageId } });
  if (!message) throw new Error("Message not found");

  const nowImportant = !message.isImportant;

  await prisma.workspaceMessage.update({
    where: { id: messageId },
    data: { isImportant: nowImportant, pinnedAt: nowImportant ? new Date() : null },
  });

  if (nowImportant) {
    const employees = await prisma.user.findMany({
      where: { active: true, id: { not: session.user.id } },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: employees.map((e) => ({
        recipientId: e.id,
        type: "IMPORTANT_ANNOUNCEMENT" as const,
        messageId,
        actorId: session.user.id,
        content: "New important announcement in Workspace",
      })),
    });
  }

  revalidatePath("/dashboard/workspace");
}

export async function searchWorkspaceAction(query: string) {
  await requireAuth();
  if (!query.trim()) return [];

  return prisma.workspaceMessage.findMany({
    where: {
      OR: [
        { content: { contains: query, mode: "insensitive" } },
        { author: { name: { contains: query, mode: "insensitive" } } },
        { attachments: { some: { OR: [{ recordId: { contains: query, mode: "insensitive" } }, { label: { contains: query, mode: "insensitive" } }] } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      author: { select: { id: true, name: true } },
      attachments: true,
      mentions: { include: { mentionedUser: { select: { id: true, name: true } } } },
    },
  });
}

export async function searchEmployeesForMention(query: string) {
  await requireAuth();
  if (!query.trim()) return [];
  return prisma.user.findMany({
    where: { active: true, name: { contains: query, mode: "insensitive" } },
    select: { id: true, name: true },
    take: 8,
  });
}

export async function searchAttachableRecords(
  type: "LEAD" | "PROFILE" | "MEETING" | "PAYMENT" | "SUBSCRIPTION",
  query: string
) {
  await requireAuth();
  if (!query.trim()) return [];

  if (type === "LEAD") {
    const leads = await prisma.lead.findMany({
      where: { deletedAt: null, OR: [{ name: { contains: query, mode: "insensitive" } }, { phone: { contains: query } }] },
      select: { id: true, name: true, phone: true },
      take: 8,
    });
    return leads.map((l) => ({ id: l.id, label: `${l.name} (${l.phone})` }));
  }

  if (type === "PROFILE") {
    const profiles = await prisma.profile.findMany({
      where: { deletedAt: null, OR: [{ name: { contains: query, mode: "insensitive" } }, { profileCode: { contains: query, mode: "insensitive" } }] },
      select: { id: true, name: true, profileCode: true },
      take: 8,
    });
    return profiles.map((p) => ({ id: p.id, label: `${p.name} (${p.profileCode})` }));
  }

  if (type === "MEETING") {
    const meetings = await prisma.meeting.findMany({
      where: { profile: { deletedAt: null, name: { contains: query, mode: "insensitive" } } },
      select: { id: true, scheduledAt: true, profile: { select: { name: true } } },
      take: 8,
    });
    return meetings.map((m) => ({
      id: m.id,
      label: `${m.profile.name} — ${new Date(m.scheduledAt).toLocaleDateString("en-IN")}`,
    }));
  }

  if (type === "PAYMENT") {
    const payments = await prisma.payment.findMany({
      where: { subscription: { profile: { deletedAt: null, name: { contains: query, mode: "insensitive" } } } },
      select: { id: true, amount: true, subscription: { select: { profile: { select: { name: true } } } } },
      take: 8,
    });
    return payments.map((p) => ({ id: p.id, label: `₹${p.amount} — ${p.subscription.profile.name}` }));
  }

  if (type === "SUBSCRIPTION") {
    const subs = await prisma.subscription.findMany({
      where: { profile: { deletedAt: null, name: { contains: query, mode: "insensitive" } } },
      select: { id: true, profile: { select: { name: true } }, plan: { select: { name: true } } },
      take: 8,
    });
    return subs.map((s) => ({ id: s.id, label: `${s.profile.name} — ${s.plan.name}` }));
  }

  return [];
}

export async function getNotifications() {
  const session = await requireAuth();
  return prisma.notification.findMany({
    where: { recipientId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: { select: { name: true } } },
  });
}

export async function getUnreadNotificationCount() {
  const session = await requireAuth();
  return prisma.notification.count({
    where: { recipientId: session.user.id, read: false },
  });
}

export async function markNotificationReadAction(id: string) {
  await requireAuth();
  await prisma.notification.update({ where: { id }, data: { read: true } });
  revalidatePath("/dashboard/workspace");
}

export async function markAllNotificationsReadAction() {
  const session = await requireAuth();
  await prisma.notification.updateMany({
    where: { recipientId: session.user.id, read: false },
    data: { read: true },
  });
  revalidatePath("/dashboard/workspace");
}