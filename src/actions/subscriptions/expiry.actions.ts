"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export async function getExpiringSubscriptions(daysAhead: number) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 86400000);

  const isScopedRole = !["ADMIN", "SUPER_ADMIN"].includes(session.user.role);

  return prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gte: now, lte: cutoff },
      ...(isScopedRole
        ? { profile: { assignedToId: session.user.id } }
        : {}),
    },
    orderBy: { endDate: "asc" },
    include: {
      profile: { select: { id: true, name: true, profileCode: true } },
      plan: { select: { name: true } },
    },
  });
}