"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { revalidatePath } from "next/cache";

export async function approveProfileAction(profileId: string) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) throw new Error("Unauthorized");

  await prisma.profile.update({ where: { id: profileId }, data: { approvalStatus: "APPROVED", approvalNotes: null } });
  await prisma.activityLog.create({ data: { actorId: await getActingUserId(session), action: "APPROVE_PROFILE", entityType: "Profile", entityId: profileId } });
  revalidatePath("/dashboard/admin/profiles");
}

export async function requestChangesAction(profileId: string, notes: string) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) throw new Error("Unauthorized");

  await prisma.profile.update({ where: { id: profileId }, data: { approvalStatus: "NEEDS_CHANGES", approvalNotes: notes } });
  await prisma.activityLog.create({ data: { actorId: await getActingUserId(session), action: "REQUEST_PROFILE_CHANGES", entityType: "Profile", entityId: profileId } });
  revalidatePath("/dashboard/admin/profiles");
}

export async function getPendingApprovalProfiles() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) throw new Error("Unauthorized");
  return prisma.profile.findMany({ where: { approvalStatus: "PENDING_APPROVAL" }, orderBy: { createdAt: "desc" } });
}