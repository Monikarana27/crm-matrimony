"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { generateProfileCode } from "@/lib/utils/profile-code";
import { profileSchema } from "@/lib/validations/profile.schema";
import { extractProfileData, extractPartnerPreferenceData, formDataToProfileRaw } from "@/lib/utils/profile-data";
import { redirect } from "next/navigation";
import { regenerateProfileEmbedding } from "@/lib/ai/regenerate-embedding";

function requireProfileCreatorRole(session: { user?: { role?: string } } | null) {
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN", "PROFILE_CREATOR", "SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"].includes(session.user.role ?? "")) {
    throw new Error("Unauthorized");
  }
}

export async function createStandaloneProfileAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await auth();
  requireProfileCreatorRole(session);

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const gender = String(formData.get("gender") || "");
  const source = String(formData.get("source") || "").trim();

  if (!name || !phone || !["MALE", "FEMALE", "OTHER"].includes(gender)) {
    return { error: "Name, phone, and gender are required." };
  }

  const profileCode = await generateProfileCode(gender as "MALE" | "FEMALE" | "OTHER");

  const profile = await prisma.profile.create({
    data: {
      profileCode,
      name,
      phone,
      email: email || null,
      source: source || null,
      gender: gender as "MALE" | "FEMALE" | "OTHER",
      status: "UNASSIGNED",
      approvalStatus: "APPROVED",
      createdById: session!.user!.id,
      partnerPreference: { create: {} },
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: await getActingUserId(session!),
      action: "CREATE_STANDALONE_DRAFT_PROFILE",
      entityType: "Profile",
      entityId: profile.id,
    },
  });

  redirect(`/dashboard/profile-creator/new/${profile.id}`);
}

export async function completeStandaloneProfileAction(
  profileId: string,
  _prevState: unknown,
  formData: FormData
) {
  const session = await auth();
  requireProfileCreatorRole(session);

  const raw = formDataToProfileRaw(formData);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const profileData = extractProfileData(parsed);
  const ppData = extractPartnerPreferenceData(parsed);
  if (!profileData || !ppData) return { error: "Invalid form data" };

  await prisma.profile.update({
    where: { id: profileId },
    data: {
      ...profileData,
      partnerPreference: { upsert: { create: ppData, update: ppData } },
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: await getActingUserId(session!),
      action: "COMPLETE_STANDALONE_PROFILE",
      entityType: "Profile",
      entityId: profileId,
    },
  });

  await regenerateProfileEmbedding(profileId);

  redirect(`/dashboard/profile-creator`);
}
