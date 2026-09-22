"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

// Finds the profile that belongs to a lead: explicit link first, then the profile
// created through the queue, then a unique phone match (last 10 digits).
export async function resolveLeadProfileAction(leadId: string): Promise<{ profileId: string | null }> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      phone: true,
      convertedProfileId: true,
      profileQueue: { select: { createdProfileId: true } },
    },
  });
  if (!lead) return { profileId: null };
  if (lead.convertedProfileId) return { profileId: lead.convertedProfileId };
  if (lead.profileQueue?.createdProfileId) return { profileId: lead.profileQueue.createdProfileId };

  const digits = lead.phone.replace(/\D/g, "");
  if (digits.length < 10) return { profileId: null };
  const last10 = digits.slice(-10);

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    select id from profiles
    where (
      right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10) = ${last10}
      or right(regexp_replace(coalesce("altPhone", ''), '[^0-9]', '', 'g'), 10) = ${last10}
    ) and "deletedAt" is null
    limit 2`;

  return { profileId: rows.length === 1 ? rows[0].id : null };
}
