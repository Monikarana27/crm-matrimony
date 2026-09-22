import { prisma } from "@/lib/db/prisma";
import type { Gender } from "@prisma/client";

function randomDigits(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

/**
 * Generates a unique profile code like EBM3366 (male) or EBF7821 (female).
 * Retries on collision up to 5 times before falling back to a longer code.
 */
export async function generateProfileCode(gender: Gender): Promise<string> {
  const genderLetter = gender === "FEMALE" ? "F" : gender === "MALE" ? "M" : "O";

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `EB${genderLetter}${randomDigits(4)}`;
    const existing = await prisma.profile.findUnique({
      where: { profileCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  // Fallback: longer random suffix, virtually collision-proof
  return `EB${genderLetter}${randomDigits(6)}`;
}