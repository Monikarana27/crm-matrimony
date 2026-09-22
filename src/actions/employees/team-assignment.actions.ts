"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { revalidatePath } from "next/cache";
import { MANAGER_ROLE_MAP, ASSIGNABLE_ROLES } from "@/lib/hierarchy/manager-role-map";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function logActivity(actorId: string, action: string, entityId: string) {
  await prisma.activityLog.create({
    data: { actorId, action, entityType: "User", entityId },
  });
}

/**
 * Returns the eligible managers/team-leaders for a given role, i.e.
 * anyone holding one of the roles one level up in MANAGER_ROLE_MAP.
 */
export async function getManagersForRole(role: string) {
  await requireAdmin();

  const allowedRoles = MANAGER_ROLE_MAP[role];
  if (!allowedRoles) return [];

  return prisma.user.findMany({
    where: { active: true, role: { in: allowedRoles as never } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Returns every active employee holding the given role, along with
 * their current manager's name (if any), so the UI can pre-check
 * whoever already reports to the selected leader and show a warning
 * for anyone who reports to someone else.
 */
export async function getEmployeesForRole(role: string) {
  await requireAdmin();

  if (!ASSIGNABLE_ROLES.includes(role as (typeof ASSIGNABLE_ROLES)[number])) {
    return [];
  }

  return prisma.user.findMany({
    where: { active: true, role: role as never },
    select: {
      id: true,
      name: true,
      email: true,
      managerId: true,
      manager: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Bulk-assigns the given employee IDs (all of the given role) to the
 * given leader. Anyone of that role currently assigned to this leader
 * but NOT in the list gets unassigned (managerId cleared). Employees
 * assigned to a DIFFERENT leader and included in the list are
 * reassigned — the confirmation for that happens client-side before
 * this action is called.
 */
export async function bulkAssignTeamAction(
  leaderId: string,
  role: string,
  employeeIds: string[]
) {
  const session = await requireAdmin();

  const allowedManagerRoles = MANAGER_ROLE_MAP[role];
  if (!allowedManagerRoles) {
    return { error: "Invalid role for team assignment" };
  }

  const leader = await prisma.user.findUnique({ where: { id: leaderId } });
  if (!leader || !allowedManagerRoles.includes(leader.role)) {
    return { error: "Selected leader is not eligible to manage this role" };
  }

  if (employeeIds.includes(leaderId)) {
    return { error: "A leader cannot be assigned to their own team" };
  }

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { id: { in: employeeIds }, role: role as never },
      data: { managerId: leaderId },
    }),
    prisma.user.updateMany({
      where: {
        role: role as never,
        managerId: leaderId,
        id: { notIn: employeeIds.length > 0 ? employeeIds : [""] },
      },
      data: { managerId: null },
    }),
  ]);

  await logActivity(await getActingUserId(session), "BULK_ASSIGN_TEAM", leaderId);

  revalidatePath("/dashboard/admin/team-hierarchy");
  revalidatePath("/dashboard/admin/employees");

  return { error: null };
}