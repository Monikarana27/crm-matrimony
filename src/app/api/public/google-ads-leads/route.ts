import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { getSystemUserId } from "@/lib/system-user";
import { findExistingLeadByPhone } from "@/lib/leads/duplicate-check";

function keyMatches(given: unknown): boolean {
  const secret = process.env.GOOGLE_ADS_WEBHOOK_KEY;
  if (!secret || typeof given !== "string" || !given) return false;
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

type Col = { column_id?: string; column_name?: string; string_value?: string };

async function handleLead(body: any) {
  const leadId = String(body.lead_id ?? "").trim();
  const isTest = body.is_test === true;
  const cols: Col[] = Array.isArray(body.user_column_data) ? body.user_column_data : [];

  const known = new Set(["FULL_NAME", "FIRST_NAME", "LAST_NAME", "EMAIL", "PHONE_NUMBER"]);
  const byId: Record<string, string> = {};
  const extra: string[] = [];
  for (const c of cols) {
    const id = String(c.column_id ?? "").toUpperCase();
    const val = String(c.string_value ?? "").trim();
    if (!val) continue;
    if (known.has(id)) byId[id] = val;
    else extra.push(String(c.column_name || id || "field") + ": " + val);
  }

  const first = byId["FIRST_NAME"] ?? "";
  const last = byId["LAST_NAME"] ?? "";
  const name = (byId["FULL_NAME"] || (first + " " + last).trim() || "Google Ads Lead").trim();
  const phone = (byId["PHONE_NUMBER"] || "").trim();
  const email = byId["EMAIL"] ? byId["EMAIL"].toLowerCase() : null;

  if (!phone) {
    console.error("Google Ads lead without phone, skipped", leadId);
    return;
  }

  const marker = "Google lead id: " + leadId;
  const meta = [
    isTest ? "TEST LEAD (Google Ads test data)" : "",
    body.campaign_id ? "Campaign id: " + body.campaign_id : "",
    body.adgroup_id ? "Ad group id: " + body.adgroup_id : "",
    body.creative_id ? "Creative id: " + body.creative_id : "",
    body.form_id ? "Form id: " + body.form_id : "",
    body.gcl_id ? "GCLID: " + body.gcl_id : "",
    leadId ? marker : "",
  ].filter(Boolean);
  const notes = [...extra, ...meta].join("\n");

  // Same Google lead id already stored (even if soft-deleted): nothing to do.
  if (leadId) {
    const dup = await prisma.lead.findFirst({
      where: { source: "Google Ads", notes: { endsWith: marker } },
      select: { id: true },
    });
    if (dup) return;
  }

  const systemUserId = await getSystemUserId();

  const existing = await findExistingLeadByPhone(phone);
  if (existing) {
    if (email) {
      await prisma.lead.updateMany({ where: { id: existing.id, email: null }, data: { email } });
    }
    await prisma.leadRemark.create({
      data: {
        leadId: existing.id,
        actorId: systemUserId,
        outcome: "FOLLOW_UP",
        remark: "New Google Ads enquiry received for this number. Name given: " + name + ".\n" + notes.slice(0, 500),
      },
    });
    return;
  }

  const lead = await prisma.lead.create({
    data: {
      name,
      phone,
      email,
      source: "Google Ads",
      status: "NEW",
      notes: notes || null,
      createdById: systemUserId,
      assignedToId: null,
    },
  });

  await prisma.activityLog.create({
    data: { actorId: systemUserId, action: "GOOGLE_ADS_LEAD_CREATED", entityType: "Lead", entityId: lead.id },
  });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  if (!keyMatches(body?.google_key)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await handleLead(body);
  } catch (err) {
    console.error("Google Ads lead webhook failed", err);
    return new NextResponse("Error", { status: 500 });
  }
  return NextResponse.json({ success: true });
}
