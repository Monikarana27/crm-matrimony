"use server";

import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/permissions/require-permission";
import { revalidatePath } from "next/cache";

/**
 * One row per employee for the "Employee Access" list page: their
 * role, how many permissions that role grants, and how many extra
 * ones have been granted to them individually.
 */
export async function getEmployeeAccessSummary() {
  await requirePermission("Employees", "VIEW");

  const employees = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  const [roleCounts, employeeGrantCounts] = await Promise.all([
    prisma.rolePermission.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.employeePermission.groupBy({ by: ["userId"], _count: { _all: true } }),
  ]);

  const roleCountMap = new Map(roleCounts.map((r) => [r.role, r._count._all]));
  const extraCountMap = new Map(employeeGrantCounts.map((g) => [g.userId, g._count._all]));

  return employees.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    role: e.role,
    rolePermissionCount: roleCountMap.get(e.role) ?? 0,
    extraPermissionCount: extraCountMap.get(e.id) ?? 0,
  }));
}

/**
 * Everything needed to render the "Additional Access" screen for one
 * employee: their role's default permissions (locked, inherited) and
 * whatever extra grants they've been given individually.
 */
export async function getEmployeeAccess(employeeId: string) {
  const employee = await prisma.user.findUniqueOrThrow({
    where: { id: employeeId },
    select: { id: true, name: true, email: true, role: true },
  });

  const [allPermissions, roleGrants, employeeGrants] = await Promise.all([
    prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] }),
    prisma.rolePermission.findMany({
      where: { role: employee.role },
      select: { permissionId: true },
    }),
    prisma.employeePermission.findMany({
      where: { userId: employeeId },
      include: { grantedBy: { select: { name: true } } },
    }),
  ]);

  const rolePermissionIds = new Set(roleGrants.map((g) => g.permissionId));
  const employeeGrantByPermissionId = new Map(employeeGrants.map((g) => [g.permissionId, g]));

  return {
    employee,
    permissions: allPermissions,
    rolePermissionIds,
    employeeGrantByPermissionId,
  };
}

/**
 * Grants one employee extra access to a permission their role doesn't
 * already include. No-ops (returns early) if their role already
 * covers it, so we never create a redundant/confusing override row.
 */
export async function grantEmployeeAccess(employeeId: string, permissionId: string, note?: string) {
  const session = await requirePermission("Employees", "EDIT");

  const employee = await prisma.user.findUniqueOrThrow({
    where: { id: employeeId },
    select: { role: true },
  });

  const alreadyViaRole = await prisma.rolePermission.findFirst({
    where: { role: employee.role, permissionId },
  });
  if (alreadyViaRole) {
    return { ok: false, reason: "This employee's role already includes that permission." };
  }

  await prisma.employeePermission.upsert({
    where: { userId_permissionId: { userId: employeeId, permissionId } },
    update: { note, grantedById: session.user.id, grantedAt: new Date() },
    create: { userId: employeeId, permissionId, note, grantedById: session.user.id },
  });

  await prisma.activityLog.create({
    data: {
      actorId: session.user.id,
      action: "GRANT_EXTRA_PERMISSION",
      entityType: "User",
      entityId: employeeId,
    },
  });

  revalidatePath(`/dashboard/admin/employees/${employeeId}/permissions`);
  revalidatePath("/dashboard/admin/employee-access");
  return { ok: true };
}

/** Removes a previously granted extra permission from one employee. */
export async function revokeEmployeeAccess(employeeId: string, permissionId: string) {
  const session = await requirePermission("Employees", "EDIT");

  await prisma.employeePermission.deleteMany({
    where: { userId: employeeId, permissionId },
  });

  await prisma.activityLog.create({
    data: {
      actorId: session.user.id,
      action: "REVOKE_EXTRA_PERMISSION",
      entityType: "User",
      entityId: employeeId,
    },
  });

  revalidatePath(`/dashboard/admin/employees/${employeeId}/permissions`);
  revalidatePath("/dashboard/admin/employee-access");
  return { ok: true };
}
/**
 * Distinct permission modules an employee has been granted extra
 * access to, beyond what their role already includes. Used to extend
 * their sidebar with pages their role wouldn't normally show.
 */
export async function getEmployeeExtraModules(employeeId: string): Promise<string[]> {
  const grants = await prisma.employeePermission.findMany({
    where: { userId: employeeId },
    include: { permission: { select: { module: true } } },
  });
  return Array.from(new Set(grants.map((g) => g.permission.module)));
}
