"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { callLogSchema } from "@/lib/validations/call-log.schema";
import { revalidatePath } from "next/cache";

async function requireStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function logActivity(actorId: string, action: string, entityId: string) {
  await prisma.activityLog.create({
    data: { actorId, action, entityType: "CallLog", entityId },
  });
}

export async function getCallLogs() {
  const session = await requireStaff();
  const isScopedRole = ["SALES", "SERVICE"].includes(session.user.role);

  return prisma.callLog.findMany({
    where: isScopedRole ? { createdById: session.user.id } : {},
    orderBy: { calledAt: "desc" },
    include: {
      profile: { select: { id: true, name: true, profileCode: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function createCallLogAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await requireStaff();

  const parsed = callLogSchema.safeParse({
    profileId: formData.get("profileId"),
    outcome: formData.get("outcome") || "CONNECTED",
    notes: formData.get("notes"),
    durationMinutes: formData.get("durationMinutes"),
    durationSeconds: formData.get("durationSeconds"),
    nextFollowUpAt: formData.get("nextFollowUpAt"),
    recordingUrl: formData.get("recordingUrl"),
    qualityScore: formData.get("qualityScore"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const mins = parseInt(parsed.data.durationMinutes || "0") || 0;
  const secs = parseInt(parsed.data.durationSeconds || "0") || 0;
  const totalSeconds = mins * 60 + secs;

  const callLog = await prisma.callLog.create({
    data: {
      profileId: parsed.data.profileId,
      outcome: parsed.data.outcome,
      notes: parsed.data.notes || null,
      durationSeconds: totalSeconds > 0 ? totalSeconds : null,
      nextFollowUpAt: parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : null,
      recordingUrl: parsed.data.recordingUrl || null,
      qualityScore: parsed.data.qualityScore ? parseInt(parsed.data.qualityScore) : null,
      createdById: session.user.id,
    },
  });

  await logActivity(await getActingUserId(session), "CREATE_CALL_LOG", callLog.id);

  revalidatePath("/dashboard/admin/welcome-calls");
  revalidatePath("/dashboard/service/welcome-calls");
  return { error: null };
}