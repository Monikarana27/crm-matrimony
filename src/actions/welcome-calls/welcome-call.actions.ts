"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";
import { getTeamMemberIds } from "@/lib/hierarchy/team";
import { getActingUserId } from "@/lib/auth/get-acting-user";

async function requireStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

const TEAM_ROLES = ["SALES_TL", "SALES_MANAGER", "SERVICE_TL", "SERVICE_MANAGER"];
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
const SALES_ROLES = ["SALES", "SALES_TL", "SALES_MANAGER"];
const SERVICE_ROLES = ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"];

export async function getWelcomeCalls(filter?: {
  status?: "PENDING" | "COMPLETED";
  department?: "SALES" | "SERVICE";
}) {
  const session = await requireStaff();
  const role = session.user.role;

  let scopeFilter: Record<string, unknown> = {};

  if (ADMIN_ROLES.includes(role)) {
    scopeFilter = filter?.department
      ? { assignedTo: { role: { in: filter.department === "SALES" ? SALES_ROLES : SERVICE_ROLES } } }
      : {};
  } else if (TEAM_ROLES.includes(role)) {
    const teamIds = await getTeamMemberIds(session.user.id);
    scopeFilter = { assignedToId: { in: [session.user.id, ...teamIds] } };
  } else {
    scopeFilter = { assignedToId: session.user.id };
  }

  const rows = await prisma.welcomeCall.findMany({
    where: {
      ...scopeFilter,
      ...(filter?.status ? { status: filter.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      lead: { select: { id: true, name: true, phone: true, email: true } },
      profile: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          profileCode: true,
          subscriptions: {
            orderBy: { startDate: "desc" },
            take: 1,
            include: {
              plan: { select: { name: true } },
              payments: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { soldById: true },
              },
            },
          },
        },
      },
      assignedTo: { select: { id: true, name: true, role: true } },
      logs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const soldByIds = Array.from(
    new Set(
      rows
        .map((wc) => wc.profile?.subscriptions[0]?.payments[0]?.soldById)
        .filter((id): id is string => Boolean(id))
    )
  );
  const soldByUsers = soldByIds.length
    ? await prisma.user.findMany({ where: { id: { in: soldByIds } }, select: { id: true, name: true } })
    : [];
  const soldByMap = new Map(soldByUsers.map((u) => [u.id, u.name]));

  return rows.map((wc) => {
    const sub = wc.profile?.subscriptions[0];
    const soldById = sub?.payments[0]?.soldById;
    return {
      ...wc,
      membershipType: sub?.plan.name ?? null,
      assignDate: sub?.startDate ?? null,
      expiryDate: sub?.endDate ?? null,
      soldBy: soldById ? soldByMap.get(soldById) ?? null : null,
      latestLogStatus: wc.logs[0]?.status ?? null,
    };
  });
}

export async function markWelcomeCallCompleteAction(id: string, attachmentUrl: string) {
  const session = await requireStaff();

  const entry = await prisma.welcomeCall.findUnique({ where: { id }, select: { assignedToId: true } });
  if (!entry) throw new Error("Not found");
  if (entry.assignedToId !== session.user.id && !ADMIN_ROLES.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  await prisma.welcomeCall.update({
    where: { id },
    data: { status: "COMPLETED", attachmentUrl, completedAt: new Date() },
  });

  revalidatePath("/dashboard/welcome-calls");
}


export async function getNewlyPaidClients() {
  const session = await requireStaff();
  if (!ADMIN_ROLES.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  return prisma.welcomeCall.findMany({
    where: { profileId: { not: null }, assignedToId: null },
    orderBy: { createdAt: "desc" },
    include: {
      profile: {
        select: {
          id: true,
          name: true,
          phone: true,
          profileCode: true,
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { plan: { select: { name: true } } },
          },
        },
      },
    },
  });
}

export async function assignServiceEmployeeToWelcomeCallAction(welcomeCallId: string, employeeId: string) {
  const session = await requireStaff();
  if (!ADMIN_ROLES.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const wc = await prisma.welcomeCall.findUnique({
    where: { id: welcomeCallId },
    select: { profileId: true },
  });
  if (!wc?.profileId) throw new Error("Welcome call has no linked profile");

  await prisma.$transaction([
    prisma.welcomeCall.update({ where: { id: welcomeCallId }, data: { assignedToId: employeeId } }),
    prisma.profile.update({
      where: { id: wc.profileId },
      data: { assignedToId: employeeId, assignedAt: new Date(), status: "ASSIGNED" },
    }),
  ]);

  await prisma.activityLog.create({
    data: {
      actorId: await getActingUserId(session),
      action: "ASSIGN_SERVICE_TO_NEWLY_PAID_CLIENT",
      entityType: "Profile",
      entityId: wc.profileId,
    },
  });

  revalidatePath("/dashboard/admin/newly-paid-clients");
  revalidatePath("/dashboard/welcome-calls");
}
