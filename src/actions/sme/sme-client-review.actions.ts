"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";
import { createSmeSelfFollowUpAction } from "@/actions/sme/sme-follow-up.actions";

export async function logSmeClientCallAction(input: {
  subscriptionId: string;
  rating: number;
  feedback: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!session.user.isSME) throw new Error("Only SMEs can log client calls");

  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be 1 to 5");
  }
  const feedback = input.feedback?.trim();
  if (!feedback) throw new Error("Write what the client said");

  const sub = await prisma.subscription.findUnique({
    where: { id: input.subscriptionId },
    select: {
      status: true,
      isPaused: true,
      profileId: true,
      profile: { select: { assignedToId: true } },
    },
  });
  if (!sub) throw new Error("Subscription not found");

  const ongoing = ["ACTIVE", "HOLD"].includes(sub.status) && !sub.isPaused;
  const pendingWelcome = await prisma.welcomeCall.findFirst({
    where: { profileId: sub.profileId, status: "PENDING" },
    select: { id: true },
  });
  if (!ongoing || pendingWelcome) throw new Error("Only ongoing-service clients can be reviewed");

  const employeeId = sub.profile.assignedToId;
  if (!employeeId) throw new Error("This client has no assigned employee");
  if (employeeId === session.user.id) throw new Error("You can't review your own clients");

  await prisma.smeClientReview.create({
    data: {
      subscriptionId: input.subscriptionId,
      employeeId,
      reviewerId: session.user.id,
      rating,
      feedback,
    },
  });

  revalidatePath("/dashboard/service");
  revalidatePath("/dashboard/sme");
}

const ATTEMPT_STATUSES = ["NOT_PICKED", "BUSY", "SWITCHED_OFF", "CALL_BACK_LATER", "WRONG_NUMBER"] as const;

async function loadReviewableClient(subscriptionId: string, userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      status: true,
      isPaused: true,
      profileId: true,
      profile: { select: { name: true, profileCode: true, assignedToId: true } },
    },
  });
  if (!sub) throw new Error("Subscription not found");

  const ongoing = ["ACTIVE", "HOLD"].includes(sub.status) && !sub.isPaused;
  const pendingWelcome = await prisma.welcomeCall.findFirst({
    where: { profileId: sub.profileId, status: "PENDING" },
    select: { id: true },
  });
  if (!ongoing || pendingWelcome) throw new Error("Only ongoing-service clients can be called here");

  const employeeId = sub.profile.assignedToId;
  if (!employeeId) throw new Error("This client has no assigned employee");
  if (employeeId === userId) throw new Error("You can't log calls on your own clients");

  return { employeeId, clientName: sub.profile.name ?? "Client", profileCode: sub.profile.profileCode };
}

/** A call that did not reach the client (didn't pick, busy, ...). Does not affect ratings. */
export async function logSmeClientAttemptAction(input: {
  subscriptionId: string;
  status: string;
  note?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!session.user.isSME) throw new Error("Only SMEs can log client calls");
  if (!(ATTEMPT_STATUSES as readonly string[]).includes(input.status)) {
    throw new Error("Pick a valid call status");
  }

  const { employeeId } = await loadReviewableClient(input.subscriptionId, session.user.id);

  await prisma.smeClientCallAttempt.create({
    data: {
      subscriptionId: input.subscriptionId,
      employeeId,
      callerId: session.user.id,
      status: input.status as (typeof ATTEMPT_STATUSES)[number],
      note: input.note?.trim() || null,
    },
  });

  revalidatePath("/dashboard/service");
  revalidatePath("/dashboard/sme");
}

/** Self-reminder to call this client again; shows up in the SME's Follow-ups tab. */
export async function scheduleSmeClientFollowUpAction(input: {
  subscriptionId: string;
  note?: string;
  followUpDate?: string | null;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!session.user.isSME) throw new Error("Only SMEs can schedule follow-ups");

  const { clientName, profileCode } = await loadReviewableClient(input.subscriptionId, session.user.id);
  const note = input.note?.trim() || "Call back";

  await createSmeSelfFollowUpAction({
    note: `Client call follow-up — ${clientName} (${profileCode}): ${note}`,
    followUpDate: input.followUpDate || null,
    clientProfileCode: profileCode,
  });

  revalidatePath("/dashboard/service");
  revalidatePath("/dashboard/sme");
}
