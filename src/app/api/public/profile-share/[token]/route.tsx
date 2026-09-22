// src/app/api/public/profile-share/[token]/route.tsx
// Publicly accessible (no auth header required) — the token itself is the
// secret. Used for "View/Download Profile" links sent to clients by email.
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db/prisma";
import { buildBiodataData } from "@/lib/biodata/build-biodata-data";
import { BiodataDocument } from "@/lib/biodata/biodata-document";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const isDownload = req.nextUrl.searchParams.get("download") === "1";

  const share = await prisma.profileShare.findUnique({
    where: { shareToken: token },
    select: { sharedProfileId: true },
  });

  if (!share) {
    return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });
  }

  const data = await buildBiodataData(share.sharedProfileId);
  if (!data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(<BiodataDocument data={data} />);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${data.profileCode}-biodata.pdf"`,
    },
  });
}
