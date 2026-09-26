"use server";

import { getAlreadySharedProfileIds } from "@/lib/profile-shares/already-shared";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";
import { sendMatchedProfilesEmail, sendProspectInterestEmail } from "@/lib/email/send-profile-email";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildBiodataData } from "@/lib/biodata/build-biodata-data";
import { BiodataDocument } from "@/lib/biodata/biodata-document";
import { createElement } from "react";
import { getHeightLabelsInCmRange } from "@/lib/constants/profile-options";

async function requireStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function getSharedProfilesForSubscription(subscriptionId: string) {
  await requireStaff();
  return prisma.profileShare.findMany({
    where: { subscriptionId },
    orderBy: { sharedAt: "desc" },
    include: {
      sharedProfile: { select: { id: true, name: true, profileCode: true, photoUrl: true, email: true } },
      sharedBy: { select: { id: true, name: true } },
      interests: { orderBy: { sentAt: "desc" }, take: 1 },
      comments: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
}

/** All profiles ever shared with this client, across every subscription/renewal — not just the currently active one. */
export async function getSharedProfilesForClient(profileId: string) {
  await requireStaff();
  return prisma.profileShare.findMany({
    where: { subscription: { profileId } },
    orderBy: { sharedAt: "desc" },
    include: {
      sharedProfile: { select: { id: true, name: true, profileCode: true, photoUrl: true, email: true } },
      sharedBy: { select: { id: true, name: true } },
      subscription: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          plan: { select: { name: true } },
        },
      },
      interests: { orderBy: { sentAt: "desc" }, take: 1 },
      comments: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
}

export async function addProfileShareCommentAction(profileShareId: string, comment: string) {
  const session = await requireStaff();
  if (!comment.trim()) return { error: "Comment cannot be empty" };

  await prisma.profileShareComment.create({
    data: { profileShareId, authorId: session.user.id, comment: comment.trim() },
  });

  revalidatePath("/dashboard/service");
  return { error: null };
}

export async function updateProspectStatusAction(
  profileShareId: string,
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "SENT"
) {
  await requireStaff();
  await prisma.profileShare.update({
    where: { id: profileShareId },
    data: { prospectStatus: status },
  });
  revalidatePath("/dashboard/service");
}

export async function updateClientInterestAction(
  profileShareId: string,
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "SENT"
) {
  await requireStaff();

  const existing = await prisma.interest.findFirst({
    where: { profileShareId },
    orderBy: { sentAt: "desc" },
  });

  if (existing) {
    await prisma.interest.update({
      where: { id: existing.id },
      data: { status, respondedAt: status !== "PENDING" ? new Date() : null },
    });
  } else {
    await prisma.interest.create({
      data: { profileShareId, status },
    });
  }

  revalidatePath("/dashboard/service");
}

export type FeedbackUpdateInput = {
  prospectStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | "HOLD";
  prospectFeedback?: string;
  clientStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | "HOLD";
  clientFeedback?: string;
};

export async function updateProfileShareFeedbackAction(
  profileShareId: string,
  input: FeedbackUpdateInput
) {
  const session = await requireStaff();

  const share = await prisma.profileShare.findUnique({
    where: { id: profileShareId },
    select: { id: true, clientStatus: true },
  });
  if (!share) return { error: "Shared profile record not found" };

  const hasProspectUpdate = input.prospectStatus !== undefined || input.prospectFeedback !== undefined;
  const hasClientUpdate = input.clientStatus !== undefined || input.clientFeedback !== undefined;

  if (hasProspectUpdate) {
    await prisma.profileShareFeedbackHistory.create({
      data: {
        profileShareId,
        type: "PROSPECT",
        status: input.prospectStatus,
        feedback: input.prospectFeedback,
        authorId: session.user.id,
      },
    });
  }

  if (hasClientUpdate) {
    await prisma.profileShareFeedbackHistory.create({
      data: {
        profileShareId,
        type: "CLIENT",
        status: input.clientStatus,
        feedback: input.clientFeedback,
        authorId: session.user.id,
      },
    });
  }

  const wasAlreadyAccepted = share.clientStatus === "ACCEPTED";

  const updateData: {
    prospectStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | "HOLD";
    prospectFeedback?: string;
    clientStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | "HOLD";
    clientFeedback?: string;
  } = {};

  if (input.prospectStatus !== undefined) updateData.prospectStatus = input.prospectStatus;
  if (input.prospectFeedback !== undefined) updateData.prospectFeedback = input.prospectFeedback;

  // Mirrors old CRM: once client status is Accepted, this form can no longer
  // overwrite client status/feedback.
  if (!wasAlreadyAccepted) {
    if (input.clientStatus !== undefined) updateData.clientStatus = input.clientStatus;
    if (input.clientFeedback !== undefined) updateData.clientFeedback = input.clientFeedback;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.profileShare.update({
      where: { id: profileShareId },
      data: updateData,
    });
  }

  revalidatePath("/dashboard/service");
  revalidatePath("/dashboard/admin/profiles");
  return { error: null };
}

export async function getProfileShareFeedbackHistory(profileShareId: string) {
  await requireStaff();
  return prisma.profileShareFeedbackHistory.findMany({
    where: { profileShareId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });
}

export type ProfileSearchFilters = {
  search?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  minAge?: number;
  maxAge?: number;
  religionIds?: string[];
  casteId?: string;
  manglik?: string;
  maritalStatus?: string;
  minHeightCm?: number;
  maxHeightCm?: number;
  motherTongueId?: string;
  country?: string;
  state?: string;
  city?: string;
  annualIncome?: string;
  educationField?: string;
  highestQualification?: string;
  profession?: string;
  paidOnly?: boolean;
};

export async function searchProfilesAction(filters: ProfileSearchFilters) {
  await requireStaff();

  const now = new Date();
  const dobFilter: { lte?: Date; gte?: Date } = {};
  if (filters.minAge) {
    dobFilter.lte = new Date(now.getFullYear() - filters.minAge, now.getMonth(), now.getDate());
  }
  if (filters.maxAge) {
    dobFilter.gte = new Date(now.getFullYear() - filters.maxAge - 1, now.getMonth(), now.getDate());
  }

  return prisma.profile.findMany({
    where: {
      deletedAt: null,
      ...(filters.search
        ? {
            OR: [
              { profileCode: { contains: filters.search, mode: "insensitive" } },
              { name: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filters.gender ? { gender: filters.gender } : {}),
      ...(filters.religionIds && filters.religionIds.length > 0 ? { religionId: { in: filters.religionIds } } : {}),
      ...(filters.casteId ? { casteId: filters.casteId } : {}),
      ...(filters.manglik ? { manglik: filters.manglik } : {}),
      ...(filters.maritalStatus ? { maritalStatus: filters.maritalStatus } : {}),
      ...(filters.minHeightCm !== undefined || filters.maxHeightCm !== undefined
        ? { height: { in: getHeightLabelsInCmRange(filters.minHeightCm, filters.maxHeightCm) } }
        : {}),
      ...(filters.motherTongueId ? { motherTongueId: filters.motherTongueId } : {}),
      ...(filters.country ? { country: filters.country } : {}),
      ...(filters.state ? { state: filters.state } : {}),
      ...(filters.city ? { city: { contains: filters.city, mode: "insensitive" as const } } : {}),
      ...(filters.annualIncome ? { annualIncome: filters.annualIncome } : {}),
      ...(filters.educationField ? { educationField: filters.educationField } : {}),
      ...(filters.highestQualification ? { highestQualification: filters.highestQualification } : {}),
      ...(filters.profession ? { profession: filters.profession } : {}),
      ...(filters.paidOnly ? { subscriptions: { some: { status: "ACTIVE" } } } : {}),
      ...(Object.keys(dobFilter).length > 0 ? { dob: dobFilter } : {}),
    },
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      religion: { select: { name: true } },
      caste: { select: { name: true } },
    },
  });
}

function calcAge(dob: Date | null): number | null {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}

const RELATIONSHIP_MANAGER_NAMES = ["Madhu bala", "Noor Jahan"];

function getDesignation(name: string | null | undefined, role: string | null | undefined): string | undefined {
  if (!role) return undefined;
  if (!role.startsWith("SERVICE")) return formatRole(role);
  if (name && RELATIONSHIP_MANAGER_NAMES.includes(name)) return "Relationship Manager";
  return "Senior Relationship Manager";
}

export async function sendSelectedProfilesAction(
  clientProfileId: string,
  toEmail: string,
  selectedProfileIds: string[]
) {
  const session = await requireStaff();

  try {
    // Never re-send a profile this client has already been sent (any subscription).
    const alreadySentIds = await getAlreadySharedProfileIds(clientProfileId, selectedProfileIds);
    const idsToSend = [...new Set(selectedProfileIds)].filter((id) => !alreadySentIds.has(id));
    const skippedNames = alreadySentIds.size
      ? (
          await prisma.profile.findMany({
            where: { id: { in: [...alreadySentIds] } },
            select: { name: true },
          })
        ).map((p) => p.name)
      : [];
    if (idsToSend.length === 0) {
      const activeSub = await prisma.subscription.findFirst({
        where: { profileId: clientProfileId, status: "ACTIVE" },
        select: { id: true },
      });
      return {
        count: 0,
        hasSubscription: !!activeSub,
        skippedNames,
        error: "All selected profiles have already been sent to this client." as string | null,
      };
    }

    const [profiles, clientProfile, sender] = await Promise.all([
      prisma.profile.findMany({
        where: { id: { in: idsToSend } },
        include: {
          religion: { select: { name: true } },
          caste: { select: { name: true } },
        },
      }),
      prisma.profile.findUnique({ where: { id: clientProfileId }, select: { name: true } }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, phone: true, role: true },
      }),
    ]);

    // Prefer the active subscription, else the latest one of any status (HOLD/EXPIRED),
      // so every send is recorded and the already-sent check keeps working.
      const subscription =
        (await prisma.subscription.findFirst({
          where: { profileId: clientProfileId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        })) ??
        (await prisma.subscription.findFirst({
          where: { profileId: clientProfileId },
          orderBy: { createdAt: "desc" },
        })); // any-status fallback

      if (!subscription) {
        return {
          count: 0,
          hasSubscription: false,
          skippedNames,
          error: "This client has no subscription, so profiles can't be sent (sends are tracked against the client's subscription). Add or renew a subscription first." as string | null,
        };
      }

        const shareUrlByProfileId = new Map<string, { viewUrl: string; downloadUrl: string }>();
        const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
    if (subscription) {
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
    }

    await sendMatchedProfilesEmail(
      toEmail,
      clientProfile?.name ?? "",
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
      {
        name: sender?.name ?? session.user.name ?? "Elite Bandhan Team",
        role: getDesignation(sender?.name, sender?.role),
        email: sender?.email ?? undefined,
        phone: sender?.phone ?? undefined,
      }
    );

    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        action: "SEND_SEARCHED_PROFILES",
        entityType: "Profile",
        entityId: selectedProfileIds[0],
      },
    });

    revalidatePath("/dashboard/service");
    return { count: profiles.length, hasSubscription: !!subscription, skippedNames, error: null as string | null };
  } catch (err) {
    // Surface the real cause instead of letting it crash the whole page with a generic digest.
    console.error("sendSelectedProfilesAction failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error while sending profiles";
    return { count: 0, hasSubscription: false, skippedNames: [] as string[], error: message };
  }
}


export async function notifyProspectAction(profileShareId: string, overrideEmail?: string) {
  const session = await requireStaff();

  const share = await prisma.profileShare.findUnique({
    where: { id: profileShareId },
    include: {
      sharedProfile: { select: { id: true, name: true, email: true, profileCode: true } },
      subscription: { include: { profile: { select: { id: true, name: true, profileCode: true } } } },
    },
  });

  if (!share) return { error: "Shared profile record not found" };

  const recipientEmail = overrideEmail?.trim() || share.sharedProfile.email;
  if (!recipientEmail) return { error: "This prospect has no email on file" };

  let shareToken = share.shareToken;
  if (!shareToken) {
    shareToken = crypto.randomBytes(24).toString("hex");
    await prisma.profileShare.update({ where: { id: share.id }, data: { shareToken } });
  }

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  const acceptUrl = `${baseUrl}/api/public/profile-share/${shareToken}/respond?action=accept`;
  const rejectUrl = `${baseUrl}/api/public/profile-share/${shareToken}/respond?action=reject`;

  const sender = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, role: true },
  });

  let attachment: { filename: string; content: Buffer } | undefined;
  try {
    const biodataData = await buildBiodataData(share.subscription.profile.id);
    if (biodataData) {
      const buffer = await renderToBuffer(createElement(BiodataDocument, { data: biodataData }) as any);
      attachment = { filename: `${biodataData.profileCode}-biodata.pdf`, content: Buffer.from(buffer) };
    }
  } catch (e) {
    console.error("Failed to generate biodata attachment for prospect email:", e);
  }

  try {
    await sendProspectInterestEmail(
      recipientEmail,
      share.sharedProfile.name,
      share.subscription.profile.name,
      share.subscription.profile.profileCode,
      acceptUrl,
      rejectUrl,
      {
        name: sender?.name ?? session.user.name ?? "Elite Bandhan Team",
        role: getDesignation(sender?.name, sender?.role),
        email: sender?.email ?? undefined,
        phone: sender?.phone ?? undefined,
      },
      attachment
    );
  } catch (err) {
    console.error("Failed to send prospect interest email:", err);
    const message = err instanceof Error ? err.message : "Unknown error while emailing prospect";
    return { error: message };
  }

  await prisma.profileShare.update({
    where: { id: share.id },
    data: { emailStatus: "SENT" },
  });

  await prisma.activityLog.create({
    data: {
      actorId: session.user.id,
      action: "NOTIFY_PROSPECT",
      entityType: "ProfileShare",
      entityId: share.id,
    },
  });

  revalidatePath("/dashboard/service");
  return { error: null as string | null };
}

// Profile IDs already sent to this client (all subscriptions) — used by the
// pickers to mark/disable profiles that must not be sent again.
export async function getAlreadySharedProfileIdsAction(clientProfileId: string): Promise<string[]> {
  await requireStaff();
  return [...(await getAlreadySharedProfileIds(clientProfileId))];
}
