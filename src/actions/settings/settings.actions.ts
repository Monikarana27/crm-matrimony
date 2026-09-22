"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { revalidatePath } from "next/cache";

const SUPER_ADMIN_ONLY_KEYS = ["security_two_factor", "workflow_auto_approve"];

export async function getSettings() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) throw new Error("Unauthorized");
  return prisma.systemSetting.findMany();
}

export async function updateSettingAction(key: string, value: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) throw new Error("Unauthorized");
  if (session.user.role === "ADMIN" && SUPER_ADMIN_ONLY_KEYS.includes(key)) {
    throw new Error("Only Super Admin can change this setting");
  }

  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  await prisma.activityLog.create({
    data: { actorId: await getActingUserId(session), action: "UPDATE_SETTING", entityType: "SystemSetting", entityId: key },
  });

  revalidatePath("/dashboard/admin/settings");
}