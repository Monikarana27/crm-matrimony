"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { profileSchema } from "@/lib/validations/profile.schema";
import { generateProfileCode } from "@/lib/utils/profile-code";
import { extractProfileData, extractPartnerPreferenceData, formDataToProfileRaw } from "@/lib/utils/profile-data";
import { redirect } from "next/navigation";
import { regenerateProfileEmbedding } from "@/lib/ai/regenerate-embedding";

export async function createProfileFromQueueAction(queueId: string, _prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN", "PROFILE_CREATOR", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const raw = formDataToProfileRaw(formData);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const profileData = extractProfileData(parsed);
  const ppData = extractPartnerPreferenceData(parsed);
  if (!profileData || !ppData) {
    return { error: "Invalid form data" };
  }

  const profileCode = await generateProfileCode(parsed.data.gender);

  const profile = await prisma.profile.create({
    data: {
      ...profileData,
      profileCode,
      status: "UNASSIGNED",
      approvalStatus: "APPROVED",
      createdById: session.user.id,
      partnerPreference: { create: ppData },
    },
  });

  await prisma.profileQueue.update({
    where: { id: queueId },
    data: { status: "COMPLETED", createdProfileId: profile.id, completedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: { actorId: await getActingUserId(session), action: "CREATE_PROFILE_FROM_QUEUE", entityType: "Profile", entityId: profile.id },
  });

  await regenerateProfileEmbedding(profile.id);

  redirect(`/dashboard/profile-creator`);
}
