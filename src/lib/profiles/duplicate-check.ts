import { prisma } from "@/lib/db/prisma";

type DuplicateInput = {
  name: string;
  phone: string;
  email?: string | null;
  excludeId?: string;
};

// Duplicate = same name (case-insensitive) AND same phone, ignoring soft-deleted.
// Returns a human-readable warning describing the existing profile, or null.
export async function findDuplicateProfileMessage({
  name,
  phone,
  email,
  excludeId,
}: DuplicateInput): Promise<string | null> {
  const existing = await prisma.profile.findFirst({
    where: {
      phone,
      name: { equals: name.trim(), mode: "insensitive" },
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    include: { assignedTo: { select: { name: true } } },
  });
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
    match = `Existing profile has email ${existing.email}.`;
  } else {
    match = "Existing profile has no email.";
  }

  const created = existing.createdAt.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `Profile already exists: ${existing.name} (${existing.phone}) · ${existing.profileCode} · status ${existing.status} · assigned to ${existing.assignedTo?.name ?? "nobody"} · added ${created}. ${match}`;
}

function nameKey(n: string): string {
  return n
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !["mr", "ms", "mrs", "miss", "dr"].includes(t))
    .sort()
    .join(" ");
}

// Looser duplicate check for creation paths: same last 10 phone digits AND the same
// name after ignoring titles (Mr/Ms/Dr), case, punctuation, spacing and word order.
export async function findDuplicateProfileLoose({
  name,
  phone,
  excludeId,
}: {
  name: string;
  phone: string;
  excludeId?: string;
}): Promise<string | null> {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const last10 = digits.slice(-10);
  const key = nameKey(name);
  if (!key) return null;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    select id from profiles
    where "deletedAt" is null
      and right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = ${last10}`;
  const ids = rows.map((r) => r.id).filter((id) => id !== excludeId);
  if (ids.length === 0) return null;

  const candidates = await prisma.profile.findMany({
    where: { id: { in: ids } },
    include: { assignedTo: { select: { name: true } } },
  });
  const existing = candidates.find((c) => nameKey(c.name) === key);
  if (!existing) return null;

  const created = existing.createdAt.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `Profile already exists: ${existing.name} (${existing.phone}) \u00b7 ${existing.profileCode} \u00b7 status ${existing.status} \u00b7 assigned to ${existing.assignedTo?.name ?? "nobody"} \u00b7 added ${created}. Open that profile instead of creating a new one.`;
}

// Returns the existing live profile matching by last 10 phone digits + normalized name, or null.
export async function findExistingProfileLoose({
  name,
  phone,
}: {
  name: string;
  phone: string;
}): Promise<{ id: string; profileCode: string; name: string } | null> {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const last10 = digits.slice(-10);
  const key = nameKey(name);
  if (!key) return null;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    select id from profiles
    where "deletedAt" is null
      and right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = ${last10}`;
  if (rows.length === 0) return null;

  const candidates = await prisma.profile.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: { id: true, profileCode: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  return candidates.find((c) => nameKey(c.name) === key) ?? null;
}
