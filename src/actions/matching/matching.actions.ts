"use server";
import { rankMatches } from "@/lib/matching/engine";
import { getAlreadySharedProfileIds } from "@/lib/profile-shares/already-shared";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

const OPEN_VALUES = new Set(["open to all", "open to any", ""]);

/** Parses a preference field that may be a plain string or a JSON-stringified
 * array (e.g. '["Lucknow,Noida,Greater Noida"]'), returning normalized
 * tokens. Also splits on commas since some fields store multi-value strings
 * inside a single array element. Returns [] if the preference is empty or
 * effectively "open to all" (caller should treat [] as "no filter"). */
function parsePreferenceValues(val: string | null | undefined): string[] {
  if (!val) return [];
  let raw: string[];
  try {
    const parsed = JSON.parse(val);
    raw = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    raw = [val];
  }
  const tokens = raw
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
  if (tokens.length === 0 || tokens.every((t) => OPEN_VALUES.has(t.toLowerCase()))) {
    return [];
  }
  return tokens;
}

export async function findCompatibleProfiles(profileId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: { partnerPreference: true },
  });
  if (!profile) throw new Error("Profile not found");

  const pref = profile.partnerPreference;
  const oppositeGender = profile.gender === "MALE" ? "FEMALE" : profile.gender === "FEMALE" ? "MALE" : undefined;

  const where: any = {
    id: { not: profileId },
    approvalStatus: "APPROVED",
    ...(oppositeGender ? { gender: oppositeGender } : {}),
  };

  // Caste/religion are compared by ID directly — no JSON/string parsing needed.
  if (pref?.religionId) where.religionId = pref.religionId;
  if (pref?.casteId) where.casteId = pref.casteId;

  // FIX: city is stored as a JSON-stringified array (and sometimes a
  // comma-joined string inside that array), so it must be parsed before
  // filtering — comparing it as a raw string against a candidate's plain
  // city value never matched, silently excluding almost everyone whenever
  // a city preference was set.
  const cities = parsePreferenceValues(pref?.city);
  if (cities.length > 0) where.city = { in: cities };

  if (pref?.maritalStatus) where.maritalStatus = pref.maritalStatus;

  if (pref?.minAge || pref?.maxAge) {
    const now = new Date();
    where.dob = {};
    if (pref.maxAge) where.dob.gte = new Date(now.getFullYear() - pref.maxAge - 1, now.getMonth(), now.getDate() + 1);
    if (pref.minAge) where.dob.lte = new Date(now.getFullYear() - pref.minAge, now.getMonth(), now.getDate());
  }

  return prisma.profile.findMany({
    where: { ...where, deletedAt: null },
    take: 50,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      profileCode: true,
      city: true,
      religionId: true,
      religion: { select: { name: true } },
      casteId: true,
      caste: { select: { name: true } },
      dob: true,
      email: true,
      profession: true,
      annualIncome: true,
    },
  });
}

// Columns the ranking engine needs (kept narrow: this scans every eligible profile).
const MATCH_SELECT = {
  id: true, name: true, profileCode: true, gender: true, dob: true, height: true,
  maritalStatus: true, religionId: true, religionOld: true, casteId: true, casteOld: true,
  motherTongueId: true, motherTongueOld: true, manglik: true, country: true, state: true,
  city: true, highestQualification: true, profession: true, annualIncome: true,
  annualIncomeCurrency: true, diet: true, drinking: true, smoking: true, photoUrl: true,
  partnerPreference: true,
} as const;

/** Ranked, explainable matches for a client profile (rule-based, no AI service). */
export async function findRankedMatches(profileId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const client = await prisma.profile.findUnique({ where: { id: profileId }, select: MATCH_SELECT });
  if (!client) throw new Error("Profile not found");

  const oppositeGender = client.gender === "MALE" ? "FEMALE" : client.gender === "FEMALE" ? "MALE" : undefined;

  const [religions, castes, tongues, candidates, sentIds] = await Promise.all([
    prisma.religion.findMany({ select: { id: true, name: true } }),
    prisma.caste.findMany({ select: { id: true, name: true } }),
    prisma.motherTongueRef.findMany({ select: { id: true, name: true } }),
    prisma.profile.findMany({
      where: {
        id: { not: profileId },
        approvalStatus: "APPROVED",
        deletedAt: null,
        ...(oppositeGender ? { gender: oppositeGender } : {}),
      },
      select: MATCH_SELECT,
    }),
    getAlreadySharedProfileIds(profileId),
  ]);

  const lookups = {
    religion: new Map(religions.map((r) => [r.id, r.name] as [string, string])),
    caste: new Map(castes.map((r) => [r.id, r.name] as [string, string])),
    tongue: new Map(tongues.map((r) => [r.id, r.name] as [string, string])),
  };

  return rankMatches(client, candidates, lookups, sentIds, 60);
}
