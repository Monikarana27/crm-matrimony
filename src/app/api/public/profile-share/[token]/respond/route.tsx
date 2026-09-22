// src/app/api/public/profile-share/[token]/respond/route.tsx
// Publicly clickable from an email — no login needed, the token is the auth.
// Records the PROSPECT's own accept/reject response on the ProfileShare row.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

function confirmationPage(message: string, accepted: boolean) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Elite Bandhan</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; background: #f4f1ed; margin: 0; padding: 40px 20px; }
    .card { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 18px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); overflow: hidden; }
    .bar { height: 6px; background: linear-gradient(90deg, #8b1538, #c79b5d, #8b1538); }
    .hero { background: linear-gradient(135deg, #7d102d 0%, #a71c1c 60%, #c79b5d 100%); color: #fff; text-align: center; padding: 28px 20px; }
    .hero h1 { margin: 0; font-size: 22px; }
    .body { padding: 28px 24px; text-align: center; }
    .icon { font-size: 40px; margin-bottom: 12px; }
    p { color: #444; font-size: 15px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="bar"></div>
    <div class="hero"><h1>Elite Bandhan</h1></div>
    <div class="body">
      <div class="icon">${accepted ? "✓" : "—"}</div>
      <p>${message}</p>
    </div>
  </div>
</body>
</html>`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const action = req.nextUrl.searchParams.get("action");

  if (action !== "accept" && action !== "reject") {
    return new NextResponse(confirmationPage("This link is invalid.", false), {
      headers: { "Content-Type": "text/html" },
      status: 400,
    });
  }

  const share = await prisma.profileShare.findUnique({
    where: { shareToken: token },
    select: { id: true },
  });

  if (!share) {
    return new NextResponse(confirmationPage("This link has expired or is no longer valid.", false), {
      headers: { "Content-Type": "text/html" },
      status: 404,
    });
  }

  await prisma.profileShare.update({
    where: { id: share.id },
    data: { prospectStatus: action === "accept" ? "ACCEPTED" : "REJECTED" },
  });

  const message =
    action === "accept"
      ? "Thank you! We've recorded your interest and our team will be in touch shortly to take things forward."
      : "Thank you for letting us know. We've recorded your response.";

  return new NextResponse(confirmationPage(message, action === "accept"), {
    headers: { "Content-Type": "text/html" },
  });
}
