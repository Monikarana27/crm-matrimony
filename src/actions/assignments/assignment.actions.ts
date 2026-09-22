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

export async function getAssignedProfiles(employeeId?: string) {
  await requireAdmin();
  return prisma.profile.findMany({
    where: {
      assignedToId: employeeId ? employeeId : { not: null },
      deletedAt: null,
    },
    orderBy: { assignedAt: "desc" },
    include: {
      assignedTo: { select: { id: true, name: true } },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
}

export async function getAssignedLeads(employeeId?: string) {
  await requireAdmin();
  return prisma.lead.findMany({
    where: {
      assignedToId: employeeId ? employeeId : { not: null },
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  });
}
