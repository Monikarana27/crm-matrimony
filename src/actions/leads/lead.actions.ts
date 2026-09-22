"use server";

import { findDuplicateLeadMessage } from "@/lib/leads/duplicate-check";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getActingUserId } from "@/lib/auth/get-acting-user";
import { leadSchema } from "@/lib/validations/lead.schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getNextSalesAssigneeForLead } from "@/lib/assignment/auto-assign";

async function requireStaff() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function logActivity(actorId: string, action: string, entityId: string) {
  await prisma.activityLog.create({
    data: { actorId, action, entityType: "Lead", entityId },
  });
}

export async function getLeads(filter?: {
  assignedToId?: string;
  status?:
    | "ACTIVE"
    | "CONVERTED"
    | "NEW"
    | "CONTACTED"
    | "PENDING"
    | "CLOSED"
    | "NOT_INTERESTED"
    | "INTERESTED";
  staleOnly?: boolean;
  followUpToday?: boolean;
  createdToday?: boolean;
  sourceStartsWith?: string;
  unassignedOnly?: boolean;
}) {
  const session = await requireStaff();
  const scopedFilter =
    !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
      ? { assignedToId: session.user.id }
      : filter?.assignedToId
      ? { assignedToId: filter.assignedToId }
      : {};

  const RAW_STATUSES = ["NEW", "CONTACTED", "PENDING", "CLOSED", "NOT_INTERESTED", "INTERESTED"] as const;

  // "All Leads" (no status param) and "Active" both hide CONVERTED and
  // NOT_INTERESTED leads by default - those live on their own dedicated
  // tabs/pages instead of cluttering the main list.
  const HIDDEN_BY_DEFAULT: ("CONVERTED" | "NOT_INTERESTED" | "CLOSED")[] = ["CONVERTED", "NOT_INTERESTED", "CLOSED"];

  const statusFilter =
    filter?.status === "CONVERTED"
      ? { status: "CONVERTED" as const }
      : filter?.status === "ACTIVE"
      ? { status: { notIn: HIDDEN_BY_DEFAULT } }
      : filter?.status && (RAW_STATUSES as readonly string[]).includes(filter.status)
      ? { status: filter.status as (typeof RAW_STATUSES)[number] }
      : { status: { notIn: HIDDEN_BY_DEFAULT } };

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const followUpFilter = filter?.followUpToday ? { followUpDate: { lte: todayEnd } } : {};

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const createdTodayFilter = filter?.createdToday
    ? { createdAt: { gte: todayStart, lte: todayEnd } }
    : {};

  const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const staleFilter = filter?.staleOnly
    ? {
        OR: [
          {
            AND: [
              { remarks: { some: {} } },
              { remarks: { none: { createdAt: { gte: staleCutoff } } } },
            ],
          },
          {
            AND: [{ remarks: { none: {} } }, { createdAt: { lt: staleCutoff } }],
          },
        ],
      }
    : {};

  const sourceFilter = filter?.sourceStartsWith
    ? { source: { startsWith: filter.sourceStartsWith } }
    : {};

  const unassignedFilter = filter?.unassignedOnly ? { assignedToId: null } : {};

  // Not Interested leads are visible to admins only.
  const isAdminRole = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  const hideNotInterested = isAdminRole
    ? {}
    : { AND: [{ status: { not: "NOT_INTERESTED" as const } }] };

  return prisma.lead.findMany({
    where: { deletedAt: null, ...scopedFilter, ...statusFilter, ...followUpFilter, ...staleFilter, ...createdTodayFilter, ...sourceFilter, ...unassignedFilter, ...hideNotInterested },
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: { select: { id: true, name: true } },
      profileQueue: { select: { id: true, status: true } },
      remarks: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { remark: true, outcome: true, createdAt: true },
      },
    },
  });
}

export async function getFollowUpLeads() {
  const session = await requireStaff();
  const scopedFilter = !["ADMIN", "SUPER_ADMIN"].includes(session.user.role) ? { assignedToId: session.user.id } : {};

  return prisma.lead.findMany({
    where: { ...scopedFilter, deletedAt: null, followUpDate: { not: null }, status: { not: "NOT_INTERESTED" } },
    orderBy: { followUpDate: "asc" },
    include: {
      assignedTo: { select: { id: true, name: true } },
      profileQueue: { select: { id: true, status: true } },
      remarks: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { remark: true, outcome: true, createdAt: true },
      },
    },
  });
}

export async function ensureFollowUpNotifications() {
  const session = await requireStaff();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    const dueLeads = await prisma.lead.findMany({
      where: {
        assignedToId: session.user.id,
        deletedAt: null,
        followUpDate: { lte: new Date() },
        status: { not: "NOT_INTERESTED" },
      },
      select: { id: true, name: true },
    });

    for (const lead of dueLeads) {
      const content = `Follow-up due: ${lead.name}`;
      const existing = await prisma.notification.findFirst({
        where: {
          recipientId: session.user.id,
          type: "LEAD_FOLLOWUP",
          content,
          createdAt: { gte: startOfDay },
        },
      });
      if (!existing) {
        await prisma.notification.create({
          data: {
            recipientId: session.user.id,
            type: "LEAD_FOLLOWUP",
            content,
            entityType: "LEAD",
            entityId: lead.id,
          },
        });
      }
    }
  }

  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  const overdueWelcomeCalls = await prisma.welcomeCall.findMany({
    where: {
      assignedToId: session.user.id,
      status: "PENDING",
      createdAt: { lte: oneDayAgo },
    },
    include: {
      lead: { select: { name: true } },
      profile: { select: { name: true } },
    },
  });

  for (const wc of overdueWelcomeCalls) {
    const contactName = wc.lead?.name ?? wc.profile?.name ?? "Unknown";
    const content = `Welcome call pending 24+ hrs: ${contactName}`;
    const existing = await prisma.notification.findFirst({
      where: {
        recipientId: session.user.id,
        type: "WELCOME_CALL_OVERDUE",
        content,
        createdAt: { gte: startOfDay },
      },
    });
    if (!existing) {
      const entityType = wc.profileId ? "PROFILE" : wc.leadId ? "LEAD" : null;
      const entityId = wc.profileId ?? wc.leadId ?? null;
      await prisma.notification.create({
        data: {
          recipientId: session.user.id,
          type: "WELCOME_CALL_OVERDUE",
          content,
          entityType,
          entityId,
        },
      });
    }
  }
}

export async function getLeadById(id: string) {
  const session = await requireStaff();
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return null;
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role) && lead.assignedToId !== session.user.id) {
    return null;
  }
  return lead;
}

export async function createLeadAction(
  _prevState: unknown,
  formData: FormData
) {
  const session = await requireStaff();

  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    gender: formData.get("gender"),
    source: formData.get("source"),
    status: formData.get("status") || "NEW",
    notes: formData.get("notes"),
    followUpDate: formData.get("followUpDate"),
    assignedToId: formData.get("assignedToId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Duplicate = same phone (last 10 digits). Blocks creation of a second lead for one number.
  const duplicateMessage = await findDuplicateLeadMessage({
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
  });
  if (duplicateMessage) {
    return { error: duplicateMessage };
  }

  // A manually picked assignee (from the optional employee-picker on the
  // creation form) takes priority over round-robin auto-assignment.
  // Leaving the picker blank auto-assigns only Meta leads; any other lead stays unassigned.
  const autoAssignedToId = parsed.data.assignedToId || (await getNextSalesAssigneeForLead(parsed.data.source));

  const lead = await prisma.lead.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      source: parsed.data.source || null,
      status: parsed.data.status,
      gender: parsed.data.gender || null,
      notes: parsed.data.notes || null,
      followUpDate: parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : null,
      createdById: session.user.id,
      assignedToId: autoAssignedToId,
      assignedAt: autoAssignedToId ? new Date() : null,
    },
  });

  if (autoAssignedToId) {
    await prisma.leadAssignmentHistory.create({
      data: {
        leadId: lead.id,
        fromEmployeeId: null,
        toEmployeeId: autoAssignedToId,
        changedById: session.user.id,
      },
    });
  }

  await logActivity(await getActingUserId(session), "CREATE_LEAD", lead.id);

  revalidatePath("/dashboard/admin/leads");
  redirect("/dashboard/admin/leads");
}

export async function updateLeadStatusAction(leadId: string, status: string) {
  const session = await requireStaff();

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: status as any },
  });

  await logActivity(await getActingUserId(session), "UPDATE_LEAD_STATUS", leadId);

  revalidatePath("/dashboard/admin/leads");
  return { success: true };
}

export async function updateLeadAction(
  id: string,
  _prevState: unknown,
  formData: FormData
) {
  const session = await requireStaff();

  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    gender: formData.get("gender"), 
    source: formData.get("source"),
    status: formData.get("status") || "NEW",
    notes: formData.get("notes"),
    followUpDate: formData.get("followUpDate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const duplicateMessage = await findDuplicateLeadMessage({
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    excludeId: id,
  });
  if (duplicateMessage) {
    return { error: duplicateMessage };
  }

  await prisma.lead.update({
    where: { id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      source: parsed.data.source || null,
      gender: parsed.data.gender || null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      followUpDate: parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : null,
    },
  });

  await logActivity(await getActingUserId(session), "UPDATE_LEAD", id);

  revalidatePath("/dashboard/admin/leads");
  redirect("/dashboard/admin/leads");
}

export async function assignLeadAction(leadId: string, employeeId: string) {
  const session = await requireStaff();
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const previous = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { assignedToId: true },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { assignedToId: employeeId, assignedAt: new Date() },
  });

  await prisma.leadAssignmentHistory.create({
    data: {
      leadId,
      fromEmployeeId: previous?.assignedToId ?? null,
      toEmployeeId: employeeId,
      changedById: session.user.id,
    },
  });

  await logActivity(await getActingUserId(session), "ASSIGN_LEAD", leadId);

  revalidatePath("/dashboard/admin/leads");
}

export async function unassignLeadAction(leadId: string) {
  const session = await requireStaff();
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const previous = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { assignedToId: true },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { assignedToId: null, assignedAt: null },
  });

  await prisma.leadAssignmentHistory.create({
    data: {
      leadId,
      fromEmployeeId: previous?.assignedToId ?? null,
      toEmployeeId: null,
      changedById: session.user.id,
    },
  });

  await logActivity(await getActingUserId(session), "UNASSIGN_LEAD", leadId);

  revalidatePath("/dashboard/admin/leads");
}

export async function bulkAssignLeadsAction(leadIds: string[], employeeId: string) {
  const session = await requireStaff();
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const leadsBefore = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, assignedToId: true },
  });

  await prisma.lead.updateMany({
    where: { id: { in: leadIds } },
    data: { assignedToId: employeeId, assignedAt: new Date() },
  });

  await prisma.leadAssignmentHistory.createMany({
    data: leadsBefore.map((lead) => ({
      leadId: lead.id,
      fromEmployeeId: lead.assignedToId,
      toEmployeeId: employeeId,
      changedById: session.user.id,
    })),
  });

  for (const leadId of leadIds) {
    await logActivity(await getActingUserId(session), "BULK_ASSIGN_LEAD", leadId);
  }

  revalidatePath("/dashboard/admin/leads");
}

export async function getLeadAssignmentHistory(leadId: string) {
  await requireStaff();
  return prisma.leadAssignmentHistory.findMany({
    where: { leadId },
    orderBy: { changedAt: "desc" },
    include: {
      fromEmployee: { select: { id: true, name: true } },
      toEmployee: { select: { id: true, name: true } },
      changedBy: { select: { id: true, name: true } },
    },
  });
}
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    throw new Error("Only admins can delete leads");
  }
  return session;
}

export async function deleteLeadAction(id: string) {
  const session = await requireAdmin();

  // Soft-delete the lead and remove its welcome calls (logs cascade).
  await prisma.$transaction([
    prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.user.id },
    }),
    prisma.welcomeCall.deleteMany({ where: { leadId: id } }),
    prisma.notification.deleteMany({ where: { entityId: id } }),
  ]);

  await logActivity(await getActingUserId(session), "DELETE_LEAD", id);

  revalidatePath("/dashboard/admin/leads");
  revalidatePath("/dashboard/sales/leads");
}
