"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";

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
