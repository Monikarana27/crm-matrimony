import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { canAccessRoute, type Role } from "@/lib/permissions/roles";
import { ROLE_ROUTE_MAP } from "@/lib/permissions/role-routes";

export async function requireRole(path: string) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role as Role;

  if (!session.user.active) {
    redirect("/login?error=inactive");
  }

  if (!canAccessRoute(role, path)) {
    redirect(`/dashboard/${ROLE_ROUTE_MAP[role] ?? role.toLowerCase()}`);
  }

  return session;
}