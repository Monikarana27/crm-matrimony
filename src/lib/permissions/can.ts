import { prisma } from "@/lib/db/prisma";
import type { Role, PermissionAction } from "@prisma/client";

const RANK: Record<PermissionAction, number> = { VIEW: 1, CREATE: 2, EDIT: 3, ASSIGN: 3, APPROVE: 4, FULL: 5 };

/**
 * Checks whether a user can perform `minAction` on `module`.
 *
 * First checks the user's Role against RolePermission (unchanged
 * behavior). If the role alone doesn't grant it, and a userId was
 * passed, also checks EmployeePermission — per-person extra access
 * granted on top of their role (e.g. one Sales rep given VIEW on
 * "Payments" without making them a Manager).
 *
 * `userId` is optional so existing call sites that only check role
 * (with no user context) keep working exactly as before.
 */
export async function can(
  role: Role,
  module: string,
  minAction: PermissionAction,
  userId?: string
): Promise<boolean> {
  const roleGrants = await prisma.rolePermission.findMany({
    where: { role, permission: { module } },
    include: { permission: true },
  });

  if (roleGrants.some((g) => RANK[g.permission.action] >= RANK[minAction])) {
    return true;
  }

  if (!userId) return false;

  const employeeGrants = await prisma.employeePermission.findMany({
    where: { userId, permission: { module } },
    include: { permission: true },
  });

  return employeeGrants.some((g) => RANK[g.permission.action] >= RANK[minAction]);
}
