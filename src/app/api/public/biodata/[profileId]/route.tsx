// src/app/api/public/biodata/[profileId]/route.tsx
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildBiodataData } from "@/lib/biodata/build-biodata-data";
import { BiodataDocument } from "@/lib/biodata/biodata-document";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PUBLIC_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profileId } = await params;
  const data = await buildBiodataData(profileId);
  if (!data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  const buffer = await renderToBuffer(<BiodataDocument data={data} />);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.profileCode}-biodata.pdf"`,
    },
  });
}