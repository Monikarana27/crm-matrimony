"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";

export async function addProfileRemarkAction(profileId: string, remark: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!remark.trim()) return { error: "Remark cannot be empty" };

  await prisma.profileRemark.create({
    data: { profileId, actorId: session.user.id, remark: remark.trim() },
  });

  revalidatePath("/dashboard/service/profiles");
  return { error: null };
}

export async function getLatestProfileRemark(profileId: string) {
  return prisma.profileRemark.findFirst({
    where: { profileId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProfileRemarks(profileId: string) {
  return prisma.profileRemark.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });
}