"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";
import type { Role } from "@/lib/permissions/roles";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];
const SERVICE_ROLES: Role[] = ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"];

async function requireStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function assertCanActOnWelcomeCall(welcomeCallId: string, userId: string, role: string) {
  const wc = await prisma.welcomeCall.findUnique({
    where: { id: welcomeCallId },
    select: { assignedToId: true },
  });
  if (!wc) throw new Error("Welcome call not found");
  if (ADMIN_ROLES.includes(role)) return;
  if (wc.assignedToId !== userId) throw new Error("Unauthorized");
}

export async function getWelcomeCallHistory(welcomeCallId: string) {
  await requireStaff();
  return prisma.welcomeCallLog.findMany({
    where: { welcomeCallId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });
}

export async function addWelcomeCallLogAction(
  welcomeCallId: string,
  status: "PENDING" | "COMPLETED" | "MISSED" | "RESCHEDULED",
  nextCallTime: string | null,
  note: string | null
) {
  const session = await requireStaff();
  await assertCanActOnWelcomeCall(welcomeCallId, session.user.id, session.user.role);

  await prisma.welcomeCallLog.create({
    data: {
      welcomeCallId,
      status,
      nextCallTime: nextCallTime ? new Date(nextCallTime) : null,
      note: note || null,
      createdById: session.user.id,
    },
  });

  if (status === "COMPLETED") {
    await prisma.welcomeCall.update({
      where: { id: welcomeCallId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  revalidatePath("/dashboard/welcome-calls");
}

export async function uploadWelcomeCallAttachmentAction(welcomeCallId: string, attachmentUrl: string) {
  const session = await requireStaff();
  await assertCanActOnWelcomeCall(welcomeCallId, session.user.id, session.user.role);

  await prisma.welcomeCall.update({
    where: { id: welcomeCallId },
    data: { attachmentUrl },
  });

  revalidatePath("/dashboard/welcome-calls");
}

export async function getServiceEmployees() {
  await requireStaff();
  return prisma.user.findMany({
    where: { role: { in: SERVICE_ROLES }, active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function reassignWelcomeCallAction(welcomeCallId: string, employeeId: string) {
  const session = await requireStaff();
  if (!ADMIN_ROLES.includes(session.user.role) && !SERVICE_ROLES.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const employee = await prisma.user.findUnique({ where: { id: employeeId }, select: { role: true, active: true } });
  if (!employee || !employee.active || !SERVICE_ROLES.includes(employee.role)) {
    throw new Error("Welcome calls can only be assigned to Service employees");
  }

  await prisma.welcomeCall.update({
    where: { id: welcomeCallId },
    data: { assignedToId: employeeId },
  });

  revalidatePath("/dashboard/welcome-calls");
}
