import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getNextSalesAssigneeForLead, createWelcomeCallEntry } from "@/lib/assignment/auto-assign";
import { getSystemUserId } from "@/lib/system-user";
import { findExistingLeadByPhone } from "@/lib/leads/duplicate-check";
import { z } from "zod";
import { logEnquiryEvent } from "@/lib/analytics/enquiry-events";

const websiteLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  autoAssign: z.boolean().optional(),
  tracking: z
    .object({
      pagePath: z.string().optional(),
      landingPath: z.string().optional(),
      referrer: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      utmTerm: z.string().optional(),
      hasClickId: z.boolean().optional(),
      device: z.string().optional(),
      pagesViewed: z.number().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.WEBSITE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = websiteLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await findExistingLeadByPhone(parsed.data.phone);
  if (existing) {
    // WEBSITE_REPEAT_REMARK: leave a visible comment so the owner sees the fresh enquiry.
    try {
      const systemId = await getSystemUserId();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await prisma.leadRemark.findFirst({
        where: {
          leadId: existing.id,
          actorId: systemId,
          createdAt: { gte: since },
          remark: { startsWith: "New website enquiry" },
        },
        select: { id: true },
      });
      if (!recent) {
        const extra = parsed.data.notes ? " Notes: " + parsed.data.notes.slice(0, 300) : "";
        await prisma.leadRemark.create({
          data: {
            leadId: existing.id,
            actorId: systemId,
            outcome: "FOLLOW_UP",
            remark: "New website enquiry received for this number. Name given: " + parsed.data.name.trim() + "." + extra,
          },
        });
      }
    } catch (err) {
      console.error("Repeat enquiry remark failed", err);
    }
    await logEnquiryEvent(String(existing.id), true, parsed.data.tracking);
    return NextResponse.json({ success: true, leadId: existing.id, note: "Lead already existed" });
  }

  const systemUserId = await getSystemUserId();
  const shouldAutoAssign = parsed.data.autoAssign !== false;
  const autoAssignedToId = shouldAutoAssign ? await getNextSalesAssigneeForLead(parsed.data.source) : null;

  const lead = await prisma.lead.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      gender: parsed.data.gender || null,
      source: parsed.data.source ? `Website - ${parsed.data.source}` : "Website",
      status: "NEW",
      notes: parsed.data.notes || null,
      createdById: systemUserId,
      assignedToId: autoAssignedToId,
    },
  });

  if (autoAssignedToId) {
    await prisma.leadAssignmentHistory.create({
      data: { leadId: lead.id, fromEmployeeId: null, toEmployeeId: autoAssignedToId, changedById: systemUserId },
    });
    await createWelcomeCallEntry({ leadId: lead.id, assignedToId: autoAssignedToId });
  }

  await prisma.activityLog.create({
    data: { actorId: systemUserId, action: "WEBSITE_LEAD_CREATED", entityType: "Lead", entityId: lead.id },
  });

  await logEnquiryEvent(String(lead.id), false, parsed.data.tracking);
  return NextResponse.json({ success: true, leadId: lead.id });
}