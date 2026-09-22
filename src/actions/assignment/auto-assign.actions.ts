"use server";

import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";
import { autoDistributeUnassignedLeads, autoDistributeUnassignedProfiles } from "@/lib/assignment/auto-assign";

export async function autoDistributeLeadsAction() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  const count = await autoDistributeUnassignedLeads(session.user.id);
  revalidatePath("/dashboard/admin/leads");
  return { count };
}

export async function autoDistributeProfilesAction() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  const count = await autoDistributeUnassignedProfiles(session.user.id);
  revalidatePath("/dashboard/admin/profiles");
  return { count };
}