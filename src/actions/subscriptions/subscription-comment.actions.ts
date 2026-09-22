"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { revalidatePath } from "next/cache";

export async function addSubscriptionCommentAction(
  subscriptionId: string,
  remark: string,
  followUpDate?: string | null
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.subscriptionComment.create({
    data: { subscriptionId, actorId: session.user.id, remark },
  });

  if (followUpDate) {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { followUpDate: new Date(followUpDate) },
    });
  }

  await prisma.activityLog.create({
    data: {
      actorId: await getActingUserId(session),
      action: "SUBSCRIPTION_COMMENT_ADDED",
      entityType: "Subscription",
      entityId: subscriptionId,
    },
  });

  revalidatePath("/dashboard/admin/subscriptions");
  revalidatePath("/dashboard/admin/ongoing-services");
}

export async function getSubscriptionComments(subscriptionId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return prisma.subscriptionComment.findMany({
    where: { subscriptionId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });
}
