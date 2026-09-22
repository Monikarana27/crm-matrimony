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
