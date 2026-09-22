"use server";

import { prisma } from "@/lib/db/prisma";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { salesTargetSchema } from "@/lib/validations/sales-target.schema";
import { revalidatePath } from "next/cache";
import { getTeamMemberIds } from "@/lib/hierarchy/team";

const TEAM_SCOPED_ROLES: Role[] = ["SALES_TL", "SALES_MANAGER", "SERVICE_TL", "SERVICE_MANAGER"];

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function requireStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function requireTeamScoped() {
  const session = await auth();
  if (!session?.user || !TEAM_SCOPED_ROLES.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function logActivity(actorId: string, action: string, entityId: string) {
  await prisma.activityLog.create({
    data: { actorId, action, entityType: "SalesTarget", entityId },
  });
}

/**
 * Achieved amount is now manually logged per employee via Achievement
 * records (admin or the employee's TL/Manager adds an amount for a
 * given month). This replaced the earlier auto-derived-from-Payment
 * logic, since Payment->Subscription->Profile.assignedToId did not
 * reliably map back to the Sales employee who closed the lead (Sales
 * works Leads, Service works Profiles — the assignee on a Profile is
 * usually Service, not Sales).
 */
async function getAchievedAmount(userId: string, month: number, year: number) {
  const result = await prisma.achievement.aggregate({
    where: { userId, month, year },
    _sum: { amount: true },
  });

  return result._sum.amount ?? 0;
}

export async function getSalesTargetsForMonth(month: number, year: number) {
  await requireAdmin();

  const employees = await prisma.user.findMany({
    where: { active: true, role: { in: ["SALES", "SERVICE", ...TEAM_SCOPED_ROLES] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  const targets = await prisma.salesTarget.findMany({
    where: { month, year },
  });

  const results = await Promise.all(
    employees.map(async (emp) => {
      const target = targets.find((t) => t.userId === emp.id);
      const achieved = await getAchievedAmount(emp.id, month, year);
      return {
        employee: emp,
        targetAmount: target?.targetAmount ?? null,
        achievedAmount: achieved,
      };
    })
  );

  return results;
}

/**
 * Team-scoped version of getSalesTargetsForMonth. Restricted to the 4
 * hierarchy roles (TL/Manager for Sales and Service). Returns targets
 * for the calling user's full recursive team (direct + indirect
 * reports), not the whole org.
 */
export async function getTeamSalesTargetsForMonth(month: number, year: number) {
  const session = await requireTeamScoped();

  const teamIds = await getTeamMemberIds(session.user.id);

  if (teamIds.length === 0) {
    return [];
  }

  const employees = await prisma.user.findMany({
    where: { active: true, id: { in: teamIds } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  const targets = await prisma.salesTarget.findMany({
    where: { month, year, userId: { in: teamIds } },
  });

  const results = await Promise.all(
    employees.map(async (emp) => {
      const target = targets.find((t) => t.userId === emp.id);
      const achieved = await getAchievedAmount(emp.id, month, year);
      return {
        employee: emp,
        targetAmount: target?.targetAmount ?? null,
        achievedAmount: achieved,
      };
    })
  );

  return results;
}

export async function getMyTarget(month: number, year: number) {
  const session = await requireStaff();
  const userId = session.user.id;

  const target = await prisma.salesTarget.findUnique({
    where: { userId_month_year: { userId, month, year } },
  });

  const achieved = await getAchievedAmount(userId, month, year);

  return {
    targetAmount: target?.targetAmount ?? null,
    achievedAmount: achieved,
  };
}

export async function setSalesTargetAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await requireStaff();

  const parsed = salesTargetSchema.safeParse({
    userId: formData.get("userId"),
    month: formData.get("month"),
    year: formData.get("year"),
    targetAmount: formData.get("targetAmount"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  const isTeamScopedRole = TEAM_SCOPED_ROLES.includes(session.user.role);

  if (!isAdmin) {
    if (!isTeamScopedRole) {
      return { error: "Unauthorized" };
    }
    const teamIds = await getTeamMemberIds(session.user.id);
    if (!teamIds.includes(parsed.data.userId)) {
      return { error: "You can only set targets for members of your own team" };
    }
  }

  const target = await prisma.salesTarget.upsert({
    where: {
      userId_month_year: {
        userId: parsed.data.userId,
        month: parsed.data.month,
        year: parsed.data.year,
      },
    },
    update: { targetAmount: parsed.data.targetAmount },
    create: {
      userId: parsed.data.userId,
      month: parsed.data.month,
      year: parsed.data.year,
      targetAmount: parsed.data.targetAmount,
      createdById: session.user.id,
    },
  });

  await logActivity(session.user.id, "SET_SALES_TARGET", target.id);

  revalidatePath("/dashboard/admin/sales-targets");
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/service");
  return { error: null };
}

/**
 * Manually log an achievement amount for an employee for a given
 * month/year. Admin can log for anyone; TL/Manager only for their
 * own team. Multiple entries in the same month are additive (e.g.
 * logging two separate deals), not a single overwritten total.
 */
export async function addAchievementAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await requireStaff();

  const userId = formData.get("userId") as string;
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const amount = Number(formData.get("amount"));
  const note = formData.get("note") as string | null;

  if (!userId || !month || !year) {
    return { error: "Missing required fields" };
  }

  if (!amount || amount <= 0) {
    return { error: "Enter a valid amount" };
  }

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  const isTeamScopedRole = TEAM_SCOPED_ROLES.includes(session.user.role);

  if (!isAdmin) {
    if (!isTeamScopedRole) {
      return { error: "Unauthorized" };
    }
    const teamIds = await getTeamMemberIds(session.user.id);
    if (!teamIds.includes(userId)) {
      return { error: "You can only add achievements for members of your own team" };
    }
  }

  const achievement = await prisma.achievement.create({
    data: {
      userId,
      month,
      year,
      amount,
      note: note || null,
      createdById: session.user.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: await getActingUserId(session),
      action: "ADD_ACHIEVEMENT",
      entityType: "Achievement",
      entityId: achievement.id,
    },
  });

  revalidatePath("/dashboard/admin/sales-targets");
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/service");
  return { error: null };
}
