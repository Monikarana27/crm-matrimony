"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { meetingSchema } from "@/lib/validations/meeting.schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function logActivity(actorId: string, action: string, entityId: string) {
  await prisma.activityLog.create({
    data: { actorId, action, entityType: "Meeting", entityId },
  });
}

export async function getMeetings(filter?: { status?: string }) {
  const session = await requireStaff();
  const isScopedRole = ["SALES", "SERVICE"].includes(session.user.role);

  return prisma.meeting.findMany({
    where: {
      ...(isScopedRole ? { assignedToId: session.user.id } : {}),
      profile: { deletedAt: null },
      ...(filter?.status ? { status: filter.status as any } : {}),
    },
    orderBy: { scheduledAt: "desc" },
    include: {
      profile: { select: { id: true, name: true, profileCode: true } },
      profileTwo: { select: { id: true, name: true, profileCode: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
}

export async function getMeetingById(id: string) {
  await requireStaff();
  return prisma.meeting.findUnique({ where: { id } });
}

export async function createMeetingAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await requireStaff();

  const parsed = meetingSchema.safeParse({
    profileId: formData.get("profileId"),
    profileTwoId: formData.get("profileTwoId"),
    type: formData.get("type") || "TELE",
    status: formData.get("status") || "SCHEDULED",
    outcome: formData.get("outcome") || "PENDING",
    scheduledAt: formData.get("scheduledAt"),
    reminderAt: formData.get("reminderAt"),
    notes: formData.get("notes"),
    assignedToId: formData.get("assignedToId"),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join(".");
    return { error: field ? `${field}: ${issue.message}` : issue.message };
  }

  // Employees may only schedule for their own clients, with prospects already
  // shared to that client. Admins/Super Admins are unrestricted.
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    const ownClient = await prisma.profile.findFirst({
      where: { id: parsed.data.profileId, deletedAt: null, assignedToId: session.user.id },
      select: { id: true },
    });
    if (!ownClient) {
      return { error: "You can only schedule meetings for your own clients." };
    }
    if (parsed.data.profileTwoId) {
      const shared = await prisma.profileShare.findFirst({
        where: {
          sharedProfileId: parsed.data.profileTwoId,
          subscription: { profileId: parsed.data.profileId },
        },
        select: { id: true },
      });
      if (!shared) {
        return { error: "That prospect hasn't been shared with this client yet." };
      }
    }
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);

  // Default reminder to 1 day before the meeting if not explicitly set.
  const reminderAt = parsed.data.reminderAt
    ? new Date(parsed.data.reminderAt)
    : new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);

  // If one matched profile is assigned to an employee and the other isn't,
  // auto-assign the unassigned one to the same employee.
  if (parsed.data.profileTwoId) {
    const [p1, p2] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: parsed.data.profileId },
        select: { id: true, assignedToId: true },
      }),
      prisma.profile.findUnique({
        where: { id: parsed.data.profileTwoId },
        select: { id: true, assignedToId: true },
      }),
    ]);

    if (p1?.assignedToId && p2 && !p2.assignedToId) {
      await prisma.profile.update({
        where: { id: p2.id },
        data: { assignedToId: p1.assignedToId, status: "ASSIGNED" },
      });
    } else if (p2?.assignedToId && p1 && !p1.assignedToId) {
      await prisma.profile.update({
        where: { id: p1.id },
        data: { assignedToId: p2.assignedToId, status: "ASSIGNED" },
      });
    }
  }

  const meeting = await prisma.meeting.create({
    data: {
      profileId: parsed.data.profileId,
      profileTwoId: parsed.data.profileTwoId || null,
      type: parsed.data.type,
      status: parsed.data.status,
      outcome: parsed.data.outcome,
      scheduledAt,
      reminderAt,
      notes: parsed.data.notes || null,
      assignedToId: parsed.data.assignedToId || null,
      createdById: session.user.id,
    },
  });

  await logActivity(await getActingUserId(session), "CREATE_MEETING", meeting.id);

  revalidatePath("/dashboard/admin/meetings");
  redirect("/dashboard/admin/meetings");
}

function istStartOfToday(): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  return new Date(Math.floor((Date.now() + IST_OFFSET_MS) / dayMs) * dayMs - IST_OFFSET_MS);
}

/**
 * Client dropdown: clients with an ongoing service (same rules as the Ongoing Services
 * page: ACTIVE, not paused, not expired, welcome call not pending). Admins see all of
 * them; everyone else only the ones assigned to them. Empty query lists them all.
 */
export async function searchMeetingClients(query: string) {
  const session = await requireStaff();
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(session.user.role);
  const q = query.trim();

  const pending = await prisma.welcomeCall.findMany({
    where: { profileId: { not: null }, status: "PENDING" },
    select: { profileId: true },
  });
  const excludeIds = pending.map((w) => w.profileId).filter((id): id is string => !!id);

  const profiles = await prisma.profile.findMany({
    where: {
      deletedAt: null,
      ...(isAdmin ? {} : { assignedToId: session.user.id }),
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
      subscriptions: {
        some: {
          status: "ACTIVE",
          isPaused: false,
          OR: [{ endDate: null }, { endDate: { gte: istStartOfToday() } }],
        },
      },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { profileCode: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, profileCode: true },
    take: 50,
  });
  return profiles.map((p) => ({ id: p.id, label: `${p.name} (${p.profileCode})` }));
}

/**
 * Prospect dropdown: profiles already shared with this client. Admins can additionally
 * type to search any profile. Employees only ever see their own client's shares.
 */
export async function searchMeetingProspects(clientId: string, query: string) {
  const session = await requireStaff();
  if (!clientId) return [];
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(session.user.role);
  const q = query.trim();
  const nameFilter = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { profileCode: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  if (isAdmin && q) {
    const profiles = await prisma.profile.findMany({
      where: { deletedAt: null, id: { not: clientId }, ...nameFilter },
      orderBy: { name: "asc" },
      select: { id: true, name: true, profileCode: true },
      take: 20,
    });
    return profiles.map((p) => ({ id: p.id, label: `${p.name} (${p.profileCode})` }));
  }

  if (!isAdmin) {
    const ownClient = await prisma.profile.findFirst({
      where: { id: clientId, deletedAt: null, assignedToId: session.user.id },
      select: { id: true },
    });
    if (!ownClient) return [];
  }

  const shares = await prisma.profileShare.findMany({
    where: {
      subscription: { profileId: clientId },
      sharedProfile: { deletedAt: null, ...nameFilter },
    },
    orderBy: { sharedAt: "desc" },
    select: { sharedProfile: { select: { id: true, name: true, profileCode: true } } },
    take: 200,
  });

  const unique = new Map<string, { id: string; label: string }>();
  for (const s of shares) {
    const p = s.sharedProfile;
    if (!unique.has(p.id)) unique.set(p.id, { id: p.id, label: `${p.name} (${p.profileCode})` });
  }
  return Array.from(unique.values()).slice(0, 50);
}

export async function updateMeetingStatusAction(
  meetingId: string,
  status: "SCHEDULED" | "COMPLETED" | "MISSED" | "CANCELLED"
) {
  const session = await requireStaff();

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status },
  });

  await logActivity(await getActingUserId(session), `MEETING_STATUS_${status}`, meetingId);

  revalidatePath("/dashboard/admin/meetings");
}

export async function updateMeetingOutcomeAction(
  meetingId: string,
  outcome: "PENDING" | "POSITIVE" | "NEGATIVE" | "ONE_SIDED" | "FOLLOW_UP_NEEDED"
) {
  const session = await requireStaff();

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { outcome },
  });

  await logActivity(await getActingUserId(session), `MEETING_OUTCOME_${outcome}`, meetingId);

  revalidatePath("/dashboard/admin/meetings");
}

export async function rescheduleMeetingAction(meetingId: string, scheduledAt: string) {
  const session = await requireStaff();

  const newDate = new Date(scheduledAt);

  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      scheduledAt: newDate,
      status: "SCHEDULED",
      // push the reminder along with the new date, keeping the same 1-day-before offset
      reminderAt: new Date(newDate.getTime() - 24 * 60 * 60 * 1000),
    },
  });

  await logActivity(await getActingUserId(session), "RESCHEDULE_MEETING", meetingId);

  revalidatePath("/dashboard/admin/meetings");
}

export async function updateMeetingNotesAction(meetingId: string, notes: string) {
  const session = await requireStaff();

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { notes: notes || null },
  });

  await logActivity(await getActingUserId(session), "UPDATE_MEETING_NOTES", meetingId);

  revalidatePath("/dashboard/admin/meetings");
}

export async function deleteMeetingAction(meetingId: string) {
  const session = await requireStaff();
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Only Admins can delete meetings");
  }

  await prisma.meeting.delete({ where: { id: meetingId } });

  await logActivity(await getActingUserId(session), "DELETE_MEETING", meetingId);

  revalidatePath("/dashboard/admin/meetings");
}
