"use server";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { prisma } from "@/lib/db/prisma";
import { sendProfileEmail } from "@/lib/email/send-profile-email";

export async function sendProfileEmailAction(profileId: string, toEmail: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) throw new Error("Profile not found");

  await sendProfileEmail(toEmail, profile.name, profile.profileCode, profile.photoUrl);
  await prisma.activityLog.create({
    data: { actorId: await getActingUserId(session), action: "EMAIL_PROFILE", entityType: "Profile", entityId: profileId },
  });
}