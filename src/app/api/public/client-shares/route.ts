// src/app/api/public/client-shares/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PUBLIC_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contact = req.nextUrl.searchParams.get("contact");
  if (!contact) {
    return NextResponse.json({ error: "contact is required" }, { status: 400 });
  }

  const clientProfile = await prisma.profile.findFirst({
    where: { OR: [{ email: contact }, { phone: contact }] },
    select: { id: true },
  });
  if (!clientProfile) {
    return NextResponse.json({ shares: [] });
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { profileId: clientProfile.id },
    select: { id: true },
  });

  const shares = await prisma.profileShare.findMany({
    where: { subscriptionId: { in: subscriptions.map((s) => s.id) } },
    orderBy: { sharedAt: "desc" },
    include: {
      sharedProfile: {
        select: { id: true, name: true, dob: true, city: true, profession: true, photoUrl: true },
      },
      interests: { orderBy: { sentAt: "desc" }, take: 1 },
      feedbackHistory: {
        where: { type: "PROSPECT" },
        orderBy: { createdAt: "desc" },
        select: { feedback: true, createdAt: true, status: true },
      },
    },
  });

  return NextResponse.json({
    shares: shares.map((s) => ({
      id: s.id,
      name: s.sharedProfile.name,
      dob: s.sharedProfile.dob,
      city: s.sharedProfile.city,
      profession: s.sharedProfile.profession,
      photoUrl: s.sharedProfile.photoUrl,
      shareToken: s.shareToken,
      sharedAt: s.sharedAt,
      status: s.interests[0]?.status ?? "PENDING",
      biodataProfileId: s.sharedProfile.id,
      feedbackHistory: s.feedbackHistory.map((f) => ({
        feedback: f.feedback,
        status: f.status,
        createdAt: f.createdAt,
      })),
    })),
  });
}