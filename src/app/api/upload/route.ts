import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.active) {
    return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
  }
  if (!["SUPER_ADMIN", "ADMIN", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "PROFILE_CREATOR", "SALES", "SALES_TL", "SALES_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WEBP, or PDF files are allowed" },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const filename = `${crypto.randomUUID()}${ext}`;
  const filepath = path.join(process.cwd(), "public", "uploads", filename);

  await writeFile(filepath, Buffer.from(bytes));

  return NextResponse.json({ url: `/uploads/${filename}` });
}