// src/app/api/public/client-shares/[shareId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const SYSTEM_USER_ID = "cmty1asrn0000l311wxykscvb";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PUBLIC_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shareId } = await params;
  const { contact, status, feedback } = await req.json();

  if (!contact || !["ACCEPTED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Ownership check: this share must actually belong to the requesting client
  const share = await prisma.profileShare.findUnique({
    where: { id: shareId },
    include: { subscription: { include: { profile: { select: { email: true, phone: true } } } } },
  });
  if (!share) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const owns = share.subscription.profile.email === contact || share.subscription.profile.phone === contact;
  if (!owns) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (share.clientStatus === "ACCEPTED") {
    return NextResponse.json({ error: "This profile has already been accepted and cannot be changed." }, { status: 409 });
  }

  const existing = await prisma.interest.findFirst({
    where: { profileShareId: shareId },
    orderBy: { sentAt: "desc" },
  });

  if (existing) {
    await prisma.interest.update({
      where: { id: existing.id },
      data: { status, respondedAt: new Date() },
    });
  } else {
    await prisma.interest.create({ data: { profileShareId: shareId, status } });
  }

  await prisma.profileShare.update({
    where: { id: shareId },
    data: { clientStatus: status, clientFeedback: feedback ?? null },
  });

  await prisma.profileShareFeedbackHistory.create({
    data: {
      profileShareId: shareId,
      type: "CLIENT",
      status,
      feedback: feedback ?? null,
      authorId: SYSTEM_USER_ID,
    },
  });

  return NextResponse.json({ ok: true });
}
