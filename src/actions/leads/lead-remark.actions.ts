"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { revalidatePath } from "next/cache";

export async function addLeadRemarkAction(
  leadId: string,
  outcome: "INTERESTED" | "FOLLOW_UP" | "NOT_INTERESTED" | "DNP",
  remark: string,
  followUpDate?: string | null
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.leadRemark.create({
    data: {
      leadId,
      actorId: session.user.id,
      outcome,
      remark: remark || null,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
    },
  });

  // Remarks no longer drive Lead.status directly — status is now set
  // independently via the inline Status dropdown on the leads table.
  if (followUpDate) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { followUpDate: new Date(followUpDate) },
    });
  }

  await prisma.activityLog.create({
    data: { actorId: await getActingUserId(session), action: `LEAD_CALL_${outcome}`, entityType: "Lead", entityId: leadId },
  });

  revalidatePath(`/dashboard/admin/leads/${leadId}`);
  revalidatePath("/dashboard/admin/leads");
  revalidatePath("/dashboard/sales/leads");
  revalidatePath(`/dashboard/sales/leads/${leadId}`);
}

// Best-effort mapping from the full LeadStatus enum down to the legacy
// 4-value LeadCallOutcome, purely so old outcome-based UI (colors, filters)
// still shows something sensible for remarks created via Quick Update.
function deriveOutcomeFromStatus(status: string): "INTERESTED" | "FOLLOW_UP" | "NOT_INTERESTED" | "DNP" {
  switch (status) {
    case "INTERESTED":
    case "PRODUCT_PITCH":
    case "PTP":
    case "CONVERTED":
      return "INTERESTED";
    case "NOT_INTERESTED":
    case "NO_NOT_EXIST":
    case "WRONG_NUMBER_FAKE_LEAD":
      return "NOT_INTERESTED";
    case "NOT_REACHABLE":
    case "MEMBER_BUSY":
      return "DNP";
    default:
      return "FOLLOW_UP";
  }
}

export async function addLeadQuickUpdateAction(
  leadId: string,
  status: string,
  followUpDateTime: string | null,
  comment: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const outcome = deriveOutcomeFromStatus(status);

  await prisma.leadRemark.create({
    data: {
      leadId,
      actorId: session.user.id,
      outcome,
      status: status as any,
      remark: comment || null,
      followUpDate: followUpDateTime ? new Date(followUpDateTime) : null,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: status as any,
      ...(followUpDateTime ? { followUpDate: new Date(followUpDateTime) } : {}),
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: await getActingUserId(session),
      action: `LEAD_QUICK_UPDATE_${status}`,
      entityType: "Lead",
      entityId: leadId,
    },
  });

  revalidatePath(`/dashboard/admin/leads/${leadId}`);
  revalidatePath("/dashboard/admin/leads");
  revalidatePath("/dashboard/sales/leads");
  revalidatePath(`/dashboard/sales/leads/${leadId}`);
}

export async function getLeadTimeline(leadId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return prisma.leadRemark.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });
}
