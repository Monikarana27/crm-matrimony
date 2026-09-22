"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { hashPassword } from "@/lib/auth/password";
import { employeeSchema } from "@/lib/validations/employee.schema";
import { generateTempPassword } from "@/lib/utils/generate-password";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const ALL_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SALES",
  "SALES_TL",
  "SALES_MANAGER",
  "PROFILE_CREATOR",
  "SERVICE",
  "SERVICE_TL",
  "SERVICE_MANAGER",
  "HR",
] as const;
type AnyRole = (typeof ALL_ROLES)[number];

const MANAGER_CANDIDATE_ROLES = [
  "SALES_TL",
  "SALES_MANAGER",
  "SERVICE_TL",
  "SERVICE_MANAGER",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

// Roles with no visible "Reports To" field in the employee form
// (Profile Creator, Admin, Super Admin, HR) are auto-assigned to
// report to the primary Super Admin instead.
const NO_MANAGER_FIELD_ROLES: AnyRole[] = ["PROFILE_CREATOR", "ADMIN", "SUPER_ADMIN", "HR"];

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect(`/dashboard/${(session?.user?.role ?? "login").toLowerCase()}`);
  }
  return session;
}
async function logActivity(actorId: string, action: string, entityId: string) {
  await prisma.activityLog.create({
    data: {
      actorId,
      action,
      entityType: "User",
      entityId,
    },
  });
}

async function getSuperAdminId(excludeUserId?: string) {
  const superAdmin = await prisma.user.findFirst({
    where: {
      role: "SUPER_ADMIN",
      active: true,
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return superAdmin?.id ?? null;
}

/**
 * Roles without a visible "Reports To" field (Profile Creator, Admin,
 * Super Admin, HR) are auto-assigned to report to the primary Super Admin,
 * instead of relying on a hidden input that isn't rendered for them.
 */
async function resolveManagerId(
  role: AnyRole,
  requestedManagerId: string | null,
  selfId?: string
) {
  if (NO_MANAGER_FIELD_ROLES.includes(role)) {
    return getSuperAdminId(role === "SUPER_ADMIN" ? selfId : undefined);
  }
  return requestedManagerId || null;
}

async function requireStaff() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Returns every active employee (any role), for manual assignment
 * pickers open to non-admin staff (e.g. the lead-creation form,
 * the Newly Paid Clients welcome-call assignment screen). Unlike
 * getEmployees()/getEmployeesForRole(), this is staff-level, not
 * admin-only, since Sales/Service reps need to hit it too.
 */
export async function getAssignableEmployees() {
  await requireStaff();
  return prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function getEmployees() {
  await requireAdmin();
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      department: true,
      role: true,
      active: true,
      createdAt: true,
      managerId: true,
      manager: { select: { id: true, name: true } },
      _count: {
        select: {
          assignedLeads: true,
          assignedProfiles: true,
        },
      },
    },
  });
}

export async function getEmployeeById(id: string) {
  await requireAdmin();
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      department: true,
      role: true,
      active: true,
      managerId: true,
    },
  });
}

/**
 * Returns active users who are structurally eligible to be someone's
 * manager (i.e. hold a TL/Manager/Admin role). The employee-form
 * component filters this list further client-side, based on the
 * currently selected role, so only the correct "next level up" shows.
 */
export async function getEligibleManagerCandidates(excludeUserId?: string) {
  await requireAdmin();
  return prisma.user.findMany({
    where: {
      active: true,
      role: { in: [...MANAGER_CANDIDATE_ROLES] },
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function createEmployeeAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await requireAdmin();

  const parsed = employeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    role: formData.get("role"),
    department: formData.get("department"),
    managerId: formData.get("managerId") ?? "",
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (!parsed.data.password) {
    return { error: "Password is required for new employees" };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "An employee with this email already exists" };
  }

  const hashedPassword = await hashPassword(parsed.data.password);

  const resolvedManagerId = await resolveManagerId(parsed.data.role, parsed.data.managerId || null);

  const employee = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      password: hashedPassword,
      role: parsed.data.role,
      department: parsed.data.department || null,
      managerId: resolvedManagerId,
      active: parsed.data.active,
    },
  });

  await logActivity(await getActingUserId(session), "CREATE_EMPLOYEE", employee.id);

  revalidatePath("/dashboard/admin/employees");
  redirect("/dashboard/admin/employees");
}

export async function updateEmployeeAction(
  id: string,
  _prevState: unknown,
  formData: FormData
) {
  const session = await requireAdmin();

  const parsed = employeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    role: formData.get("role"),
    department: formData.get("department"),
    managerId: formData.get("managerId") ?? "",
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existing = await prisma.user.findFirst({
    where: { email: parsed.data.email, NOT: { id } },
  });
  if (existing) {
    return { error: "Another employee already uses this email" };
  }

  if (parsed.data.managerId === id) {
    return { error: "An employee cannot report to themselves" };
  }

  const resolvedManagerId = await resolveManagerId(parsed.data.role, parsed.data.managerId || null, id);

  const updateData: {
    name: string;
    email: string;
    phone: string | null;
    role: AnyRole;
    department: "SALES_EMP" | "PROFILE_EMP" | "SERVICE_EMP" | "HR_EMP" | null;
    managerId: string | null;
    active: boolean;
    password?: string;
  } = {
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    role: parsed.data.role,
    department: parsed.data.department || null,
    managerId: resolvedManagerId,
    active: parsed.data.active,
  };

  if (parsed.data.password) {
    updateData.password = await hashPassword(parsed.data.password);
  }

  await prisma.user.update({
    where: { id },
    data: updateData,
  });

  await logActivity(await getActingUserId(session), "UPDATE_EMPLOYEE", id);

  revalidatePath("/dashboard/admin/employees");
  redirect("/dashboard/admin/employees");
}

export async function toggleEmployeeActiveAction(id: string, active: boolean) {
  const session = await requireAdmin();

  await prisma.user.update({
    where: { id },
    data: { active },
  });

  await logActivity(await getActingUserId(session),
    active ? "ACTIVATE_EMPLOYEE" : "DEACTIVATE_EMPLOYEE",
    id
  );

  revalidatePath("/dashboard/admin/employees");
}

export async function deleteEmployeeAction(id: string) {
  const session = await requireAdmin();
  const actingUserId = await getActingUserId(session);

  if (id === actingUserId) {
    return { error: "You cannot delete your own account" };
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true },
  });

  if (!target) {
    return { error: "Employee not found" };
  }

  // Never allow deleting the last remaining admin account
  if (["ADMIN", "SUPER_ADMIN"].includes(target.role)) {
    const adminCount = await prisma.user.count({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    });
    if (adminCount <= 1) {
      return { error: "Cannot delete the last remaining admin account" };
    }
  }

  // Fallback admin to reassign this employee's records to
  const fallbackAdmin = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, NOT: { id } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!fallbackAdmin) {
    return { error: "No fallback admin account found to reassign records to" };
  }
  const fallbackId = fallbackAdmin.id;

  // Leads about to be reassigned — captured up front so we can write history rows
  const movedLeads = await prisma.lead.findMany({
    where: { assignedToId: id },
    select: { id: true },
  });

  await prisma.$transaction([
    // Optional FKs — reassign so leads/profiles/meetings don't go unassigned
    prisma.profile.updateMany({ where: { assignedToId: id }, data: { assignedToId: fallbackId } }),
    prisma.lead.updateMany({ where: { assignedToId: id }, data: { assignedToId: fallbackId, assignedAt: new Date() } }),
    prisma.leadAssignmentHistory.createMany({
      data: movedLeads.map((l) => ({
        leadId: l.id,
        fromEmployeeId: null,
        toEmployeeId: fallbackId,
        changedById: actingUserId,
        note: `Reassigned to fallback admin because previous assignee ${target.name} was deleted`,
      })),
    }),
    prisma.meeting.updateMany({ where: { assignedToId: id }, data: { assignedToId: fallbackId } }),
    prisma.callLog.updateMany({ where: { createdById: id }, data: { createdById: fallbackId } }),
    prisma.profileQueue.updateMany({ where: { sentById: id }, data: { sentById: fallbackId } }),
    prisma.welcomeCall.updateMany({ where: { assignedToId: id }, data: { assignedToId: fallbackId } }),
    // Required FKs (Restrict) — must reassign or the delete below would fail
    prisma.leadRemark.updateMany({ where: { actorId: id }, data: { actorId: fallbackId } }),
    prisma.workspaceMessage.updateMany({ where: { authorId: id }, data: { authorId: fallbackId } }),
    prisma.workspaceMention.updateMany({ where: { mentionedUserId: id }, data: { mentionedUserId: fallbackId } }),
    prisma.leadAssignmentHistory.updateMany({ where: { changedById: id }, data: { changedById: fallbackId } }),
    prisma.leadAssignmentHistory.updateMany({ where: { fromEmployeeId: id }, data: { fromEmployeeId: fallbackId } }),
    prisma.leadAssignmentHistory.updateMany({ where: { toEmployeeId: id }, data: { toEmployeeId: fallbackId } }),
    prisma.profileShareComment.updateMany({ where: { authorId: id }, data: { authorId: fallbackId } }),
    prisma.profileRemark.updateMany({ where: { actorId: id }, data: { actorId: fallbackId } }),
    prisma.paymentOffer.updateMany({ where: { createdById: id }, data: { createdById: fallbackId } }),
    // Required FKs (Cascade) — per-employee personal history, safe to remove
    prisma.salesTarget.deleteMany({ where: { userId: id } }),
    prisma.attendance.deleteMany({ where: { userId: id } }),
    prisma.payroll.deleteMany({ where: { userId: id } }),
    prisma.leaveRequest.deleteMany({ where: { userId: id } }),
    prisma.performanceReview.deleteMany({ where: { userId: id } }),
    prisma.loginEvent.deleteMany({ where: { userId: id } }),
    prisma.activityLog.deleteMany({ where: { actorId: id } }),
  ]);

  await prisma.user.delete({ where: { id } });

  await logActivity(actingUserId, "DELETE_EMPLOYEE", id);

  revalidatePath("/dashboard/admin/employees");

  return { success: true };
}

export async function resetEmployeePasswordAction(id: string) {
  const session = await requireAdmin();

  const tempPassword = generateTempPassword();
  const hashedPassword = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  await logActivity(await getActingUserId(session), "RESET_PASSWORD", id);

  revalidatePath("/dashboard/admin/employees");

  return { password: tempPassword };
}
export async function getEmployeeDocuments(userId: string) {
  await requireAdmin();
  return prisma.employeeDocument.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function addEmployeeDocumentAction(userId: string, url: string) {
  const session = await requireAdmin();
  const doc = await prisma.employeeDocument.create({
    data: { userId, url },
  });
  await logActivity(await getActingUserId(session), "ADD_EMPLOYEE_DOCUMENT", userId);
  revalidatePath(`/dashboard/admin/employees/${userId}/edit`);
  return doc;
}

export async function deleteEmployeeDocumentAction(id: string) {
  const session = await requireAdmin();
  const doc = await prisma.employeeDocument.findUnique({ where: { id } });
  if (!doc) return { error: "Document not found" };
  await prisma.employeeDocument.delete({ where: { id } });
  await logActivity(await getActingUserId(session), "DELETE_EMPLOYEE_DOCUMENT", doc.userId);
  revalidatePath(`/dashboard/admin/employees/${doc.userId}/edit`);
}
