"use server";
import { getAlreadySharedProfileIds } from "@/lib/profile-shares/already-shared";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { sendMatchedProfilesEmail } from "@/lib/email/send-profile-email";

function calcAge(dob: Date | null): number | null {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export async function sendMatchedProfilesAction(clientProfileId: string, toEmail: string, profileIds: string[]) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // any-status fallback: prefer an ACTIVE subscription, but fall back to the
  // latest subscription of any status if none is ACTIVE (same fix as
  // sendSelectedProfilesAction in profile-share.actions.ts).
  let subscription = await prisma.subscription.findFirst({
    where: { profileId: clientProfileId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    subscription = await prisma.subscription.findFirst({
      where: { profileId: clientProfileId },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!subscription) {
    return { sentCount: 0, skippedNames: [] as string[], error: "This client has no subscription, so profiles can't be sent." };
  }

  // Dedup: skip any profile already shared to this client under ANY of their
  // subscriptions (not just the current one), and ignore repeated IDs in the request.
  const alreadySentIds = await getAlreadySharedProfileIds(clientProfileId, profileIds);
  const idsToSend = [...new Set(profileIds)].filter((id) => !alreadySentIds.has(id));

  const [profiles, client, sender] = await Promise.all([
    prisma.profile.findMany({
      where: { id: { in: idsToSend } },
      include: { religion: { select: { name: true } }, caste: { select: { name: true } } },
    }),
    prisma.profile.findUnique({ where: { id: clientProfileId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, phone: true, role: true } }),
  ]);

  const skippedNames = alreadySentIds.size
    ? (
        await prisma.profile.findMany({
          where: { id: { in: [...alreadySentIds] } },
          select: { name: true },
        })
      ).map((p) => p.name)
    : [];

  if (idsToSend.length === 0) {
    return { sentCount: 0, skippedNames, error: `All selected profiles have already been sent to ${client?.name ?? "this client"}.` };
  }

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  const shareUrlByProfileId = new Map<string, { viewUrl: string; downloadUrl: string }>();

  const shareRows = idsToSend.map((sharedProfileId) => ({
    subscriptionId: subscription.id,
    sharedProfileId,
    sharedById: session.user.id,
    shareToken: crypto.randomBytes(24).toString("hex"),
  }));

  await prisma.profileShare.createMany({ data: shareRows });

  for (const row of shareRows) {
    const url = `${baseUrl}/api/public/profile-share/${row.shareToken}`;
    shareUrlByProfileId.set(row.sharedProfileId, { viewUrl: url, downloadUrl: `${url}?download=1` });
  }

  try {
    await sendMatchedProfilesEmail(
      toEmail,
      client?.name ?? "Client",
      profiles.map((p) => ({
        name: p.name,
        profileCode: p.profileCode,
        photoUrl: p.photoUrl,
        age: calcAge(p.dob),
        height: p.height,
        city: p.city,
        religionName: p.religion?.name ?? null,
        casteName: p.caste?.name ?? null,
        profession: p.profession,
        highestQualification: p.highestQualification,
        viewUrl: shareUrlByProfileId.get(p.id)?.viewUrl ?? null,
        downloadUrl: shareUrlByProfileId.get(p.id)?.downloadUrl ?? null,
      })),
      { name: sender?.name ?? "Your Relationship Manager", role: sender?.role, email: sender?.email, phone: sender?.phone }
    );
  } catch (err) {
    console.error("Failed to send matched profiles email:", err);
  }

  await prisma.activityLog.create({
    data: { actorId: session.user.id, action: "SEND_MATCHED_PROFILES", entityType: "Profile", entityId: profileIds[0] },
  });

  return { sentCount: idsToSend.length, skippedNames };
}

