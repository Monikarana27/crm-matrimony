"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getActivityLogs(filter?: { entityType?: string }) {
  await requireAdmin();
  return prisma.activityLog.findMany({
    where: filter?.entityType ? { entityType: filter.entityType } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { id: true, name: true, role: true } },
    },
  });
}

export async function getActivityEntityTypes() {
  await requireAdmin();
  const results = await prisma.activityLog.findMany({
    distinct: ["entityType"],
    select: { entityType: true },
  });
  return results.map((r) => r.entityType);
}
