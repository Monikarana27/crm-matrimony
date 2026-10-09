import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { getSystemUserId } from "@/lib/system-user";
import { findExistingLeadByPhone } from "@/lib/leads/duplicate-check";

const GRAPH = "https://graph.facebook.com/v23.0";

// GET: Meta webhook verification handshake
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  if (
    p.get("hub.mode") === "subscribe" &&
    process.env.META_VERIFY_TOKEN &&
    p.get("hub.verify_token") === process.env.META_VERIFY_TOKEN
  ) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header || !header.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const got = header.slice(7);
  if (got.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

type FieldRow = { name: string; values: string[] };

async function handleLead(leadgenId: string) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("META_PAGE_ACCESS_TOKEN not set");

  const url =
    `${GRAPH}/${leadgenId}?fields=field_data,created_time,form_id,ad_name,campaign_name,platform` +
    `&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Graph API " + res.status + ": " + (await res.text()).slice(0, 300));
  const data = (await res.json()) as {
    field_data?: FieldRow[];
    form_id?: string;
    ad_name?: string;
    campaign_name?: string;
    platform?: string;
  };

  const fields: Record<string, string> = {};
  for (const f of data.field_data ?? []) fields[f.name] = (f.values ?? []).join(", ");

  const first = fields["first_name"] ?? "";
  const last = fields["last_name"] ?? "";
  const name = (fields["full_name"] || (first + " " + last).trim() || "Meta Lead").trim();
  const phone = (fields["phone_number"] || fields["phone"] || "").trim();
  const EMAIL_RE = /[^\s,;<>()]+@[^\s,;<>()]+\.[^\s,;<>()]+/;
  let emailKey: string | null = null;
  let email: string | null = null;
  for (const [k, v] of Object.entries(fields)) {
    const m = (v || "").match(EMAIL_RE);
    if (m && (k.toLowerCase().includes("mail") || k === "email")) { emailKey = k; email = m[0].toLowerCase(); break; }
  }
  if (!email) {
    for (const [k, v] of Object.entries(fields)) {
      const m = (v || "").match(EMAIL_RE);
      if (m) { emailKey = k; email = m[0].toLowerCase(); break; }
    }
  }

  if (!phone) {
    console.error("Meta lead without phone, skipped", leadgenId);
    return;
  }

  const known = new Set(["full_name", "first_name", "last_name", "phone_number", "phone", "email"]);
  const noteLines = Object.entries(fields)
    .filter(([k]) => !known.has(k) && k !== emailKey)
    .map(([k, v]) => k.replace(/_/g, " ") + ": " + v);
  const meta = [
    data.campaign_name ? "Campaign: " + data.campaign_name : "",
    data.ad_name ? "Ad: " + data.ad_name : "",
    data.platform ? "Platform: " + data.platform : "",
    "Meta lead id: " + leadgenId,
  ].filter(Boolean);
  const notes = [...noteLines, ...meta].join("\n");

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
        remark: "New Meta Ads enquiry received for this number. Name given: " + name + ".\n" + notes.slice(0, 500),
      },
    });
    return;
  }

  const lead = await prisma.lead.create({
    data: {
      name,
      phone,
      email,
      source: "Meta Ads",
      status: "NEW",
      notes: notes || null,
      createdById: systemUserId,
      assignedToId: null,
    },
  });

  await prisma.activityLog.create({
    data: { actorId: systemUserId, action: "META_LEAD_CREATED", entityType: "Lead", entityId: lead.id },
  });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field === "leadgen" && change.value?.leadgen_id) {
          await handleLead(String(change.value.leadgen_id));
        }
      }
    }
  } catch (err) {
    console.error("Meta lead webhook failed", err);
    return new NextResponse("Error", { status: 500 });
  }
  return NextResponse.json({ success: true });
}
