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

/** Today's date in IST (YYYY-MM-DD), used to stamp entries added to an existing follow-up. */
function istDateStamp() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Drops the repeated "PP request follow-up — Name (phone): " lead-in when adding to an existing follow-up. */
function stripPPLeadIn(s: string) {
  return s.replace(/^PP request follow-up — .*?\):\s*/, "");
}

function appendEntry(existing: string, added: string) {
  return `${existing}\n\n[${istDateStamp()}] ${stripPPLeadIn(added)}`;
}

/**
 * Follow-up date/time is stored verbatim: the literal digits the user typed,
 * saved into a UTC-labeled field rather than converted from IST. Accepts
 * "YYYY-MM-DD" (date input) or "YYYY-MM-DDTHH:mm" (datetime-local input).
 */
function parseVerbatimFollowUp(value: string): Date {
  const iso = value.length === 10 ? `${value}T00:00:00Z` : `${value}:00Z`;
  return new Date(iso);
}

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

  const newDate = input.followUpDate ? parseVerbatimFollowUp(input.followUpDate) : null;

  // One follow-up per client: if this SME already has an open follow-up for the
  // same employee + client, add to it instead of creating another card.
  const existing = clientProfileId
    ? await prisma.smeFollowUp.findFirst({
        where: {
          employeeId: employee.id,
          clientProfileId,
          createdById: user.id,
          resolvedAt: null,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, note: true },
      })
    : null;

  const created = existing
    ? await prisma.smeFollowUp.update({
        where: { id: existing.id },
        data: {
          note: appendEntry(existing.note, note),
          ...(newDate ? { followUpDate: newDate } : {}),
        },
        select: { id: true },
      })
    : await prisma.smeFollowUp.create({
        data: {
          employeeId: employee.id,
          clientProfileId,
          createdById: user.id,
          note,
          followUpDate: newDate,
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

/** SME schedules a private follow-up for themselves (e.g. from PP Validation review). No role check on the assignee since it is always the caller. */
export async function createSmeSelfFollowUpAction(input: {
  note: string;
  followUpDate?: string | null;
  clientProfileCode?: string | null;
  ppRequestId?: string | null;
}) {
  const user = await requireSme();

  const note = input.note?.trim();
  if (!note) throw new Error("Note is required");

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

  const newDate = input.followUpDate ? parseVerbatimFollowUp(input.followUpDate) : null;
  const ppRequestId = input.ppRequestId || null;

  // One follow-up per client: add to the open follow-up for this PP request
  // (or this client profile) instead of creating another card.
  const existing =
    ppRequestId || clientProfileId
      ? await prisma.smeFollowUp.findFirst({
          where: {
            employeeId: user.id,
            createdById: user.id,
            resolvedAt: null,
            ...(ppRequestId ? { ppRequestId } : { clientProfileId }),
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, note: true },
        })
      : null;

  if (existing) {
    await prisma.smeFollowUp.update({
      where: { id: existing.id },
      data: {
        note: appendEntry(existing.note, note),
        ...(newDate ? { followUpDate: newDate } : {}),
      },
    });
  } else {
    await prisma.smeFollowUp.create({
      data: {
        employeeId: user.id,
        clientProfileId,
        ppRequestId,
        createdById: user.id,
        note,
        followUpDate: newDate,
      },
      select: { id: true },
    });
  }

  revalidateAll();
}
