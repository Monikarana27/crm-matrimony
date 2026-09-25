"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";

const SERVICE_ROLES = ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER"];

async function requireSme() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!session.user.isSME) throw new Error("Only SMEs can manage follow-ups");
  return session.user;
}

function revalidateAll() {
  revalidatePath("/dashboard/service");
  revalidatePath("/dashboard/sme");
}

const preview = (s: string) => (s.length > 90 ? s.slice(0, 90) + "…" : s);

export async function createSmeFollowUpAction(input: {
  employeeId: string;
  note: string;
  followUpDate?: string | null;
  clientProfileCode?: string | null;
}) {
  const user = await requireSme();

  const note = input.note?.trim();
  if (!note) throw new Error("Note is required");

  const employee = await prisma.user.findUnique({
    where: { id: input.employeeId },
    select: { id: true, role: true },
  });
  if (!employee || !SERVICE_ROLES.includes(employee.role)) {
    throw new Error("Select a valid Service employee");
  }

  let clientProfileId: string | null = null;
  const code = input.clientProfileCode?.trim().toUpperCase();
  if (code) {
    const profile = await prisma.profile.findUnique({
      where: { profileCode: code },
      select: { id: true },
    });
    if (!profile) throw new Error(`No client profile found with code ${code}`);
    clientProfileId = profile.id;
  }

  const created = await prisma.smeFollowUp.create({
    data: {
      employeeId: employee.id,
      clientProfileId,
      createdById: user.id,
      note,
      followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
    },
    select: { id: true },
  });

  if (employee.id !== user.id) {
    await prisma.notification.create({
      data: {
        recipientId: employee.id,
        type: "SME_FOLLOWUP",
        entityType: "SME_FOLLOWUP",
        entityId: created.id,
        actorId: user.id,
        content: `${user.name ?? "SME"} flagged a follow-up for you: ${preview(note)}`,
      },
    });
  }

  revalidateAll();
}

/** SME side: open -> resolved, resolved -> reopened. Creator only. */
export async function toggleSmeFollowUpResolvedAction(id: string) {
  const user = await requireSme();
  const row = await prisma.smeFollowUp.findFirst({
    where: { id, createdById: user.id },
    select: { id: true, resolvedAt: true },
  });
  if (!row) throw new Error("Follow-up not found");

  await prisma.smeFollowUp.update({
    where: { id: row.id },
    data: row.resolvedAt
      ? { resolvedAt: null, resolvedById: null }
      : { resolvedAt: new Date(), resolvedById: user.id },
  });
  revalidateAll();
}

export async function deleteSmeFollowUpAction(id: string) {
  const user = await requireSme();
  const res = await prisma.smeFollowUp.deleteMany({
    where: { id, createdById: user.id },
  });
  if (res.count === 0) throw new Error("Follow-up not found");
  revalidateAll();
}

/** Employee side: the assignee marks their own open follow-up as done. */
export async function markSmeFollowUpDoneAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const row = await prisma.smeFollowUp.findFirst({
    where: { id, employeeId: session.user.id, resolvedAt: null },
    select: { id: true, note: true, createdById: true },
  });
  if (!row) throw new Error("Follow-up not found");

  await prisma.smeFollowUp.update({
    where: { id: row.id },
    data: { resolvedAt: new Date(), resolvedById: session.user.id },
  });

  if (row.createdById !== session.user.id) {
    await prisma.notification.create({
      data: {
        recipientId: row.createdById,
        type: "SME_FOLLOWUP_DONE",
        entityType: "SME_FOLLOWUP",
        entityId: row.id,
        actorId: session.user.id,
        content: `${session.user.name ?? "An employee"} marked a follow-up done: ${preview(row.note)}`,
      },
    });
  }

  revalidateAll();
}
