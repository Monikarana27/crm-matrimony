import { prisma } from "@/lib/db/prisma";

type DuplicateInput = {
  name: string;
  phone: string;
  email?: string | null;
  excludeId?: string;
};

// Duplicate = same phone (last 10 digits, any formatting), any status, ignoring soft-deleted.
// Returns a human-readable warning describing the existing lead, or null.
function lastTenDigits(phone: string) {
  return phone.replace(/[^0-9]/g, "").slice(-10);
}

// Finds a live lead whose phone has the same last 10 digits, whatever the formatting.
export async function findExistingLeadByPhone(phone: string, excludeId?: string) {
  const key = lastTenDigits(phone);
  if (key.length < 10) {
    return prisma.lead.findFirst({
      where: { phone, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      include: { assignedTo: { select: { name: true } } },
    });
  }
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "leads"
    WHERE "deletedAt" IS NULL
      AND RIGHT(REGEXP_REPLACE("phone", '[^0-9]', '', 'g'), 10) = ${key}
    LIMIT 20`;
  const hit = rows.find((r) => r.id !== excludeId);
  if (!hit) return null;
  return prisma.lead.findUnique({
    where: { id: hit.id },
    include: { assignedTo: { select: { name: true } } },
  });
}

export async function findDuplicateLeadMessage({
  name,
  phone,
  email,
  excludeId,
}: DuplicateInput): Promise<string | null> {
  const existing = await findExistingLeadByPhone(phone, excludeId);
  if (!existing) return null;

  const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();
  const newEmail = norm(email);
  const oldEmail = norm(existing.email);

  let match: string;
  if (newEmail === oldEmail) {
    match = newEmail ? "Email also matches — exact duplicate." : "No email on either — exact duplicate.";
  } else if (oldEmail && newEmail) {
    match = `Email differs (existing: ${existing.email}).`;
  } else if (oldEmail) {
    match = `Existing lead has email ${existing.email}.`;
  } else {
    match = "Existing lead has no email.";
  }

  const created = existing.createdAt.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `Lead already exists: ${existing.name} (${existing.phone}) · ID ${existing.id} · status ${existing.status} · assigned to ${existing.assignedTo?.name ?? "nobody"} · added ${created}. ${match}`;
}
