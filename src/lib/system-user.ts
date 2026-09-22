import { prisma } from "@/lib/db/prisma";

let cachedId: string | null = null;

export async function getSystemUserId(): Promise<string> {
  if (cachedId) return cachedId;
  const user = await prisma.user.findUnique({ where: { email: "system@elitebandhan.internal" } });
  if (!user) throw new Error("System user not found — run scripts/create-system-user.ts first");
  cachedId = user.id;
  return cachedId;
}