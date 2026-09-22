import "server-only";
import { auth } from "@/lib/auth/auth";
import { can } from "@/lib/permissions/can";
import type { Role, PermissionAction } from "@prisma/client";

export async function requirePermission(module: string, action: PermissionAction) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  if (!session.user.active) {
    throw new Error("Account is inactive");
  }
  // Pass the user's id so `can()` also checks any extra access
  // granted to this specific employee, not just their role.
  const allowed = await can(session.user.role as Role, module, action, session.user.id);
  if (!allowed) {
    throw new Error(`Forbidden: missing ${action} permission on ${module}`);
  }
  return session;
}

// NOTE: the two other places that call `can()` directly should be
// updated the same way to benefit from per-employee overrides:
//
// src/actions/payments/payment.actions.ts:17
//   - const allowed = await can(session.user.role, "Payments", minAction);
//   + const allowed = await can(session.user.role, "Payments", minAction, session.user.id);
//
// src/app/api/biodata/[profileId]/route.tsx:23
//   - const allowed = await can(session.user.role, "Profiles", "VIEW");
//   + const allowed = await can(session.user.role, "Profiles", "VIEW", session.user.id);
