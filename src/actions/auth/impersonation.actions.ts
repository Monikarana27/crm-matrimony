"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getCurrentToken, setSessionToken } from "@/lib/auth/impersonation";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ROLE_ROUTE_MAP } from "@/lib/permissions/role-routes";
import { getTeamMemberIds } from "@/lib/hierarchy/team";
const TEAM_SCOPED_ROLES = ["SALES_TL", "SALES_MANAGER", "SERVICE_TL", "SERVICE_MANAGER"];
export async function startImpersonationAction(targetUserId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  if (session.user.impersonating) {
    throw new Error("Cannot impersonate while already impersonating");
  }
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target || !target.active) {
    throw new Error("Target user not found or inactive");
  }
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  const isTeamScopedRole = TEAM_SCOPED_ROLES.includes(session.user.role);
  if (isAdmin) {
    if (session.user.role === "ADMIN" && ["ADMIN", "SUPER_ADMIN"].includes(target.role)) {
      throw new Error("Admins cannot impersonate other admins or super admins");
    }
  } else if (isTeamScopedRole) {
    const teamIds = await getTeamMemberIds(session.user.id);
    if (!teamIds.includes(target.id)) {
      throw new Error("You can only impersonate members of your own team");
    }
  } else {
    throw new Error("Unauthorized");
  }
  const currentToken = await getCurrentToken();
  if (!currentToken) throw new Error("No active session");
  await setSessionToken({
    ...currentToken,
    sub: target.id,
    name: target.name,
    email: target.email,
    role: target.role,
    active: target.active,
    impersonating: true,
    originalUserId: session.user.id,
    originalUserName: session.user.name,
  });
  await prisma.activityLog.create({
    data: {
      actorId: session.user.id,
      action: "START_IMPERSONATION",
      entityType: "User",
      entityId: target.id,
    },
  });
  // Bust the client router cache for the whole dashboard tree so the
  // impersonation banner and role-specific layout render fresh, even
  // when redirecting to a URL that's identical to the one we're
  // already on (e.g. a SERVICE_MANAGER "viewing as" a SERVICE employee
  // both resolve to /dashboard/service).
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/${ROLE_ROUTE_MAP[target.role] ?? target.role.toLowerCase()}`);
}
export async function endImpersonationAction(){
  const session = await auth();

  // Idempotent: if we're already back to a non-impersonating session
  // (e.g. the user double-clicked "Return to Admin Account" against a
  // stale cached page), just send them to their own dashboard instead
  // of throwing — a crash screen should never be the result of
  // clicking a button twice.
  if (!session?.user?.impersonating || !session.user.originalUserId) {
    if (session?.user) {
      revalidatePath("/dashboard", "layout");
      redirect(`/dashboard/${ROLE_ROUTE_MAP[session.user.role] ?? session.user.role.toLowerCase()}`);
    }
    throw new Error("Not currently impersonating");
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.user.originalUserId },
  });
  if (!admin) throw new Error("Original admin account not found");
  const currentToken = await getCurrentToken();
  if (!currentToken) throw new Error("No active session");
  await setSessionToken({
    ...currentToken,
    sub: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    active: admin.active,
    impersonating: undefined,
    originalUserId: undefined,
    originalUserName: undefined,
  });
  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      action: "END_IMPERSONATION",
      entityType: "User",
      entityId: session.user.id,
    },
  });
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/${ROLE_ROUTE_MAP[admin.role] ?? admin.role.toLowerCase()}`);
}