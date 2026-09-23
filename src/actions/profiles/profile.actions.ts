"use server";

import { findDuplicateProfileMessage } from "@/lib/profiles/duplicate-check";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { profileSchema } from "@/lib/validations/profile.schema";
import { generateProfileCode } from "@/lib/utils/profile-code";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extractProfileData, extractPartnerPreferenceData, formDataToProfileRaw } from "@/lib/utils/profile-data";
import { regenerateProfileEmbedding } from "@/lib/ai/regenerate-embedding";

async function requireStaff() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function logActivity(actorId: string, action: string, entityId: string) {
  await prisma.activityLog.create({
    data: { actorId, action, entityType: "Profile", entityId },
  });
}

export async function getProfiles(filter?: {
  status?: "UNASSIGNED" | "ASSIGNED" | "REASSIGNED" | "ON_HOLD" | "EXPIRED";
  assignedToId?: string;
  source?: string;
}) {
  const session = await requireStaff();
  const isScopedRole = !["ADMIN", "SUPER_ADMIN", "PROFILE_CREATOR"].includes(session.user.role);

  return prisma.profile.findMany({
    where: {
      ...(isScopedRole ? { assignedToId: session.user.id } : {}),
      ...(!isScopedRole && filter?.status ? { status: filter.status } : {}),
      ...(!isScopedRole && filter?.assignedToId ? { assignedToId: filter.assignedToId } : {}),
      ...(filter?.source ? { source: filter.source } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  });
}

export type ProfileStatusLabel =
  | "Lead Only"
  | "Awaiting Creation"
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Needs Changes";

export type UnifiedProfileRow = {
  id: string; // profileId if it exists, else leadId — used as the table row key
  remarks?: { remark: string; createdAt: Date }[];
  kind: "LEAD" | "QUEUE" | "PROFILE";
  profileId: string | null;
  leadId: string | null;
  queueId: string | null;
  profileCode: string | null;
  name: string;
  gender: string | null;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  city: string | null;
  religion: string | null;
  dob: Date | null;
  status: string | null; // ProfileStatus — only meaningful once a Profile exists
  approvalStatus: string | null;
  profileStatusLabel: ProfileStatusLabel;
  createdAt: Date;
  assignedTo: { id: string; name: string } | null;
};

export async function getUnifiedProfiles(filter?: {
  status?: "UNASSIGNED" | "ASSIGNED" | "REASSIGNED" | "ON_HOLD" | "EXPIRED";
  assignedToId?: string;
  source?: string;
  approvalStatus?: "PENDING_APPROVAL" | "APPROVED" | "NEEDS_CHANGES";
  paid?: boolean;
}) {
  const session = await requireStaff();
  const isScopedRole = !["ADMIN", "SUPER_ADMIN", "PROFILE_CREATOR"].includes(session.user.role);

  // Existing completed/in-progress-via-approval profiles — unchanged behavior.
  const profiles = await prisma.profile.findMany({
    where: {
      deletedAt: null,
      ...(isScopedRole ? { assignedToId: session.user.id } : {}),
      ...(!isScopedRole && filter?.status ? { status: filter.status } : {}),
      ...(!isScopedRole && filter?.assignedToId ? { assignedToId: filter.assignedToId } : {}),
      ...(filter?.source ? { source: filter.source } : {}),
      ...(filter?.approvalStatus ? { approvalStatus: filter.approvalStatus } : {}),
      ...(filter?.paid ? { subscriptions: { some: { status: "ACTIVE" } } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: { select: { id: true, name: true } },
      religion: { select: { name: true } }, // NEW: need this to display religion below
      remarks: { orderBy: { createdAt: "desc" }, take: 1, select: { remark: true, createdAt: true } },
    },
  });

  const profileRows: UnifiedProfileRow[] = profiles.map((p) => ({
    id: p.id,
    kind: "PROFILE",
    remarks: p.remarks,
    profileId: p.id,
    leadId: null,
    queueId: null,
    profileCode: p.profileCode,
    name: p.name,
    gender: p.gender,
    phone: p.phone,
    email: p.email,
    photoUrl: p.photoUrl,
    city: p.city,
    religion: p.religion?.name ?? null, // CHANGED: relation -> .name
    dob: p.dob,
    status: p.status,
    approvalStatus: p.approvalStatus,
    profileStatusLabel:
      p.approvalStatus === "APPROVED"
        ? "Approved"
        : p.approvalStatus === "NEEDS_CHANGES"
          ? "Needs Changes"
          : "Pending Approval",
    createdAt: p.createdAt,
    assignedTo: p.assignedTo,
  }));

  // Skip the two "in flight" categories entirely when a specific ProfileStatus
  // tab/filter is active — those don't apply until a Profile actually exists.
  if (filter?.status || filter?.source || filter?.approvalStatus || filter?.paid) {
    return profileRows;
  }

  // Leads sent to the queue but not yet started or not yet finished.
  const inFlightQueue = await prisma.profileQueue.findMany({
    where: { status: { in: ["PENDING", "IN_PROGRESS"] }, ...(isScopedRole ? { lead: { assignedToId: session.user.id } } : {}) },
    orderBy: { sentToQueueAt: "desc" },
    include: { lead: { include: { assignedTo: { select: { id: true, name: true } } } } },
  });

  const queueRows: UnifiedProfileRow[] = inFlightQueue.map((q) => ({
    id: q.leadId,
    kind: "QUEUE",
    profileId: null,
    leadId: q.leadId,
    queueId: q.id,
    profileCode: null,
    name: q.lead.name,
    gender: q.lead.gender,
    phone: q.lead.phone,
    email: q.lead.email,
    photoUrl: null,
    city: null,
    religion: null,
    dob: null,
    status: null,
    approvalStatus: null,
    profileStatusLabel: q.status === "PENDING" ? "Awaiting Creation" : "Draft",
    createdAt: q.sentToQueueAt,
    assignedTo: q.lead.assignedTo,
  }));

  // Leads marked Interested by sales but not yet sent to profile creation at all.
  const looseLeads = await prisma.lead.findMany({
    where: {
      status: "INTERESTED",
      profileQueue: null,
      convertedProfileId: null,
      ...(isScopedRole ? { assignedToId: session.user.id } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  const leadRows: UnifiedProfileRow[] = looseLeads.map((l) => ({
    id: l.id,
    kind: "LEAD",
    profileId: null,
    leadId: l.id,
    queueId: null,
    profileCode: null,
    name: l.name,
    gender: l.gender,
    phone: l.phone,
    email: l.email,
    photoUrl: null,
    city: null,
    religion: null,
    dob: null,
    status: null,
    approvalStatus: null,
    profileStatusLabel: "Lead Only",
    createdAt: l.createdAt,
    assignedTo: l.assignedTo,
  }));

  return [...leadRows, ...queueRows, ...profileRows].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

// Strict version: staff roles only get profiles assigned to them. Used by the edit page.
export async function getMyProfileById(id: string) {
  const session = await requireStaff();
  const isScopedRole = !["ADMIN", "SUPER_ADMIN", "PROFILE_CREATOR"].includes(session.user.role);
  if (isScopedRole) {
    // Broadened from "own-assigned only" so Sales/Service staff can also edit any
    // approved profile they encounter (e.g. a match candidate for one of their
    // clients), not just profiles directly assigned to them.
    const allowed = await prisma.profile.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ assignedToId: session.user.id }, { approvalStatus: "APPROVED" }],
      },
      select: { id: true },
    });
    if (!allowed) return null;
  }
  return getProfileById(id);
}

export async function getProfileById(id: string) {
  await requireStaff();
  return prisma.profile.findUnique({
    where: { id },
    include: {
      religion: true,
      caste: true,
      gotra: true,
      motherTongueRef: true,
      assignedTo: { select: { id: true, name: true } },
      documents: { where: { type: "PHOTO" }, orderBy: { order: "asc" } },
      partnerPreference: {
        include: { religion: true, caste: true, motherTongueRef: true },
      },
    },
  });
}

export async function createProfileAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await requireStaff();

  const raw = formDataToProfileRaw(formData);
  const parsed = profileSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const profileData = extractProfileData(parsed);
  const ppData = extractPartnerPreferenceData(parsed);
  if (!profileData || !ppData) {
    return { error: "Invalid form data" };
  }

  // Duplicate = same name AND same phone (family members may share a number).
  const duplicateMessage = await findDuplicateProfileMessage({
    name: profileData.name,
    phone: profileData.phone,
    email: profileData.email,
  });
  if (duplicateMessage) {
    return { error: duplicateMessage };
  }

  const profileCode = await generateProfileCode(parsed.data.gender);
  const autoAssignedToId = null as string | null; // auto-assignment disabled: profiles are assigned manually

  const profile = await prisma.profile.create({
    data: {
      ...profileData,
      profileCode,
      createdById: session.user.id,
      partnerPreference: { create: ppData },
      ...(autoAssignedToId
        ? { assignedToId: autoAssignedToId, assignedAt: new Date(), status: "ASSIGNED" as const }
        : {}),
    },
  });

  await logActivity(await getActingUserId(session), "CREATE_PROFILE", profile.id);

  await regenerateProfileEmbedding(profile.id);


  revalidatePath("/dashboard/admin/profiles");
  redirect(`/dashboard/admin/profiles`);
}

export async function updateProfileAction(
  id: string,
  _prevState: unknown,
  formData: FormData
) {
  const session = await requireStaff();

  const raw = formDataToProfileRaw(formData);
  const parsed = profileSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const profileData = extractProfileData(parsed);
  const ppData = extractPartnerPreferenceData(parsed);
  if (!profileData || !ppData) {
    return { error: "Invalid form data" };
  }

  // Duplicate = same name AND same phone as a different profile.
  const duplicateMessage = await findDuplicateProfileMessage({
    name: profileData.name,
    phone: profileData.phone,
    email: profileData.email,
    excludeId: id,
  });
  if (duplicateMessage) {
    return { error: duplicateMessage };
  }

  const currentProfile = await prisma.profile.findUnique({
    where: { id },
    select: { approvalStatus: true },
  });

  await prisma.profile.update({
    where: { id },
    data: {
      ...profileData,
      ...(currentProfile?.approvalStatus === "NEEDS_CHANGES"
        ? { approvalStatus: "APPROVED" as const, approvalNotes: null }
        : {}),
      partnerPreference: {
        upsert: {
          create: ppData,
          update: ppData,
        },
      },
    },
  });

  await logActivity(await getActingUserId(session), "UPDATE_PROFILE", id);

  await regenerateProfileEmbedding(id);

  revalidatePath("/dashboard/admin/profiles");
  revalidatePath(`/dashboard/admin/profiles/${id}`);
  revalidatePath("/dashboard/sales/profiles");
  revalidatePath("/dashboard/service/profiles");
  redirect(`/dashboard/admin/profiles/${id}?saved=true`);
}

export async function assignProfileAction(profileId: string, employeeId: string) {
  const session = await requireStaff();

  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  const wasAssigned = !!profile?.assignedToId;

  await prisma.profile.update({
    where: { id: profileId },
    data: {
      assignedToId: employeeId,
      assignedAt: new Date(),
      status: wasAssigned ? "REASSIGNED" : "ASSIGNED",
    },
  });

  await logActivity(await getActingUserId(session),
    wasAssigned ? "REASSIGN_PROFILE" : "ASSIGN_PROFILE",
    profileId
  );

  await prisma.welcomeCall.updateMany({
    where: { profileId, status: "PENDING" },
    data: { assignedToId: employeeId },
  });

  revalidatePath("/dashboard/admin/profiles");
}

export async function unassignProfileAction(profileId: string) {
  const session = await requireStaff();

  await prisma.profile.update({
    where: { id: profileId },
    data: { assignedToId: null, assignedAt: null, status: "UNASSIGNED" },
  });

  await logActivity(await getActingUserId(session), "UNASSIGN_PROFILE", profileId);

  revalidatePath("/dashboard/admin/profiles");
}

export async function bulkAssignProfilesAction(profileIds: string[], employeeId: string) {
  const session = await requireStaff();

  await prisma.profile.updateMany({
    where: { id: { in: profileIds } },
    data: { assignedToId: employeeId, assignedAt: new Date(), status: "ASSIGNED" },
  });

  for (const id of profileIds) {
    await logActivity(await getActingUserId(session), "BULK_ASSIGN_PROFILE", id);
  }

  await prisma.welcomeCall.updateMany({
    where: { profileId: { in: profileIds }, status: "PENDING" },
    data: { assignedToId: employeeId },
  });

  revalidatePath("/dashboard/admin/profiles");
}

export async function approveProfileAction(profileId: string) {
  const session = await requireStaff();
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Only Admins can approve profiles");
  }

  await prisma.profile.update({
    where: { id: profileId },
    data: { approvalStatus: "APPROVED", approvalNotes: null },
  });

  await logActivity(await getActingUserId(session), "APPROVE_PROFILE", profileId);
  revalidatePath("/dashboard/admin/profiles");
}

export async function rejectProfileAction(profileId: string, notes: string) {
  const session = await requireStaff();
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Only Admins can reject profiles");
  }

  await prisma.profile.update({
    where: { id: profileId },
    data: { approvalStatus: "NEEDS_CHANGES", approvalNotes: notes || null },
  });

  await logActivity(await getActingUserId(session), "REJECT_PROFILE", profileId);
  revalidatePath("/dashboard/admin/profiles");
}

export async function getProfileHistory(profileId: string) {
  await requireStaff();
  return prisma.activityLog.findMany({
    where: { entityType: "Profile", entityId: profileId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });
}

export async function deleteProfileAction(id: string) {
  const session = await requireStaff();
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Only admins can delete profiles");
  }

  // Soft-delete the profile and remove its welcome calls (test/duplicate calls
  // must vanish from the assigned employee's dashboard; logs cascade).
  await prisma.$transaction([
    prisma.profile.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.user.id },
    }),
    prisma.welcomeCall.deleteMany({ where: { profileId: id } }),
    prisma.notification.deleteMany({ where: { entityId: id } }),
  ]);

  await logActivity(await getActingUserId(session), "DELETE_PROFILE", id);

  revalidatePath("/dashboard/admin/profiles");
  revalidatePath("/dashboard/sales/profiles");
  revalidatePath("/dashboard/service/profiles");
}
