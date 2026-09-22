/**
 * src/lib/ai/profile-text.ts
 *
 * Builds the text string that gets embedded for a profile. The string is
 * meant to read like a natural free-text description of the person (and,
 * optionally, what they're looking for) rather than a raw field dump —
 * that's what lets the embedding capture "overall similarity" (tone,
 * lifestyle, etc.) rather than just exact-field overlap.
 *
 * NOTE on relations: the Profile model has religion / caste / gotra /
 * motherTongueRef as relations to lookup tables, but the exact display-name
 * field on those lookup models (assumed `name` below) wasn't confirmed from
 * the schema dump. Same for the Profile <-> PartnerPreference relation name
 * (not shown in the snippet we had). Adjust the two spots marked
 * "CONFIRM:" once you check prisma/schema.prisma for those.
 */

import type { Profile, PartnerPreference } from "@prisma/client";

// CONFIRM: swap in the real relation types once you check the lookup models
// (Religion / Caste / Gotra / MotherTongueRef) for their display-name field.
type LookupRef = { name?: string | null } | null | undefined;

export type ProfileForEmbedding = Profile & {
  religion?: LookupRef;
  caste?: LookupRef;
  gotra?: LookupRef;
  motherTongueRef?: LookupRef;
};

/**
 * Optional pre-resolved display names for PartnerPreference's multi-select
 * ID arrays (motherTongueIds, religionIds, casteIds). These arrays store
 * lookup-table IDs, so turning them into readable text requires a join the
 * caller does before calling this function (this module intentionally has
 * no DB access). Omit any you haven't resolved — they'll just be skipped.
 */
export interface ResolvedPreferenceLookups {
  motherTongueNames?: string[];
  religionNames?: string[];
  casteNames?: string[];
}

function calculateAge(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** Push a labeled sentence onto the parts array, skipping empty/null values. */
function addLine(parts: string[], label: string, value: string | null | undefined) {
  if (value && value.trim()) {
    parts.push(`${label}: ${value.trim()}`);
  }
}

/** Join non-empty strings with ", ", skipping falsy values entirely. */
function joinNonEmpty(values: Array<string | null | undefined>): string {
  return values.filter((v): v is string => !!v && v.trim().length > 0).join(", ");
}

/**
 * Build the text describing the profile itself (who this person is).
 */
function buildSelfDescription(profile: ProfileForEmbedding): string[] {
  const parts: string[] = [];

  const age = calculateAge(profile.dob);
  const identityLine = joinNonEmpty([
    profile.name,
    profile.gender,
    age !== null ? `${age} years old` : null,
    profile.maritalStatus,
    profile.height,
  ]);
  addLine(parts, "Profile", identityLine);

  const location = joinNonEmpty([profile.city, profile.state, profile.country]);
  addLine(parts, "Location", location);
  addLine(parts, "Native place", profile.nativePlace);
  addLine(parts, "Grew up in", profile.countryGrewUp);
  addLine(parts, "Citizenship", profile.citizenship);
  addLine(parts, "Visa status", profile.visaStatus);

  const religionCasteLine = joinNonEmpty([
    profile.religion?.name ?? profile.religionOld,
    profile.caste?.name ?? profile.casteOld,
    profile.subCaste,
    profile.gotra?.name ?? profile.gotraOld,
  ]);
  addLine(parts, "Religion & community", religionCasteLine);
  addLine(parts, "Mother tongue", profile.motherTongueRef?.name ?? profile.motherTongueOld);

  const horoscopeLine = joinNonEmpty([profile.manglik ? `Manglik: ${profile.manglik}` : null, profile.rashi, profile.nakshatra]);
  addLine(parts, "Horoscope", horoscopeLine);

  const educationLine = joinNonEmpty([
    profile.highestQualification,
    profile.educationField,
    profile.institute ? `from ${profile.institute}` : null,
  ]);
  addLine(parts, "Education", educationLine);

  const careerLine = joinNonEmpty([
    profile.designation,
    profile.profession,
    profile.businessName,
    profile.workingWith ? `at ${profile.workingWith}` : null,
    profile.workLocation ? `working in ${profile.workLocation}` : null,
  ]);
  addLine(parts, "Career", careerLine);

  const income =
    profile.annualIncome && profile.annualIncomeCurrency
      ? `${profile.annualIncome} ${profile.annualIncomeCurrency}`
      : profile.annualIncome;
  addLine(parts, "Annual income", income);

  const lifestyleLine = joinNonEmpty([
    profile.diet ? `Diet: ${profile.diet}` : null,
    profile.drinking ? `Drinking: ${profile.drinking}` : null,
    profile.smoking ? `Smoking: ${profile.smoking}` : null,
    profile.bodyType,
    profile.complexion,
    profile.healthStatus,
  ]);
  addLine(parts, "Lifestyle", lifestyleLine);

  const familyLine = joinNonEmpty([
    profile.familyType ? `${profile.familyType} family` : null,
    profile.fatherOccupation ? `father: ${profile.fatherOccupation}` : null,
    profile.motherOccupation ? `mother: ${profile.motherOccupation}` : null,
    typeof profile.brothers === "number" ? `${profile.brothers} brother(s)` : null,
    typeof profile.sisters === "number" ? `${profile.sisters} sister(s)` : null,
  ]);
  addLine(parts, "Family", familyLine);

  addLine(parts, "About", profile.aboutYourself);

  return parts;
}

/**
 * Build the text describing what this profile is looking for in a partner,
 * from the linked PartnerPreference row (if any).
 */
function buildPartnerPreferenceDescription(
  pref: PartnerPreference | null | undefined,
  resolved: ResolvedPreferenceLookups = {}
): string[] {
  if (!pref) return [];
  const parts: string[] = [];

  const maritalPref = pref.maritalStatusMulti?.join(", ");
  addLine(parts, "Preferred marital status", maritalPref);

  const motherTonguePref = resolved.motherTongueNames?.join(", ");
  addLine(parts, "Preferred mother tongue", motherTonguePref);

  const religionPref = resolved.religionNames?.join(", ");
  addLine(parts, "Preferred religion", religionPref);

  const castePref = resolved.casteNames?.join(", ");
  addLine(parts, "Preferred caste", castePref);

  const manglikPref = pref.manglikStatusMulti?.join(", ");
  addLine(parts, "Preferred manglik status", manglikPref);

  const childrenOkPref = pref.hasChildrenOkMulti?.join(", ");
  addLine(parts, "OK with children", childrenOkPref);

  const locationPref = joinNonEmpty([
    pref.cityMulti?.join(", "),
    pref.stateMulti?.join(", "),
    pref.countryMulti?.join(", "),
  ]);
  addLine(parts, "Preferred location", locationPref);

  const qualificationPref = pref.qualificationMulti?.join(", ");
  addLine(parts, "Preferred qualification", qualificationPref);

  const professionPref = pref.professionMulti?.join(", ");
  addLine(parts, "Preferred profession", professionPref);

  const incomePref = pref.annualIncomeRanges?.length
    ? `${pref.annualIncomeRanges.join(", ")} ${pref.annualIncomeCurrency ?? ""}`.trim()
    : null;
  addLine(parts, "Preferred income range", incomePref);

  const lifestylePref = joinNonEmpty([
    pref.dietMulti?.length ? `Diet: ${pref.dietMulti.join(", ")}` : null,
    pref.drinkingMulti?.length ? `Drinking: ${pref.drinkingMulti.join(", ")}` : null,
    pref.smokingMulti?.length ? `Smoking: ${pref.smokingMulti.join(", ")}` : null,
  ]);
  addLine(parts, "Preferred lifestyle", lifestylePref);

  addLine(parts, "Looking for", pref.aboutDesiredPartner);

  return parts;
}

/**
 * Build the full text to embed for a profile.
 *
 * @param profile   The profile record, ideally with religion/caste/gotra/
 *                   motherTongueRef relations included so we get readable
 *                   names instead of legacy free-text/IDs.
 * @param partnerPreference  The linked PartnerPreference row, if any.
 * @param resolvedLookups    Pre-resolved names for the PartnerPreference's
 *                            multi-select ID arrays (see ResolvedPreferenceLookups).
 */
export function buildProfileEmbeddingText(
  profile: ProfileForEmbedding,
  partnerPreference?: PartnerPreference | null,
  resolvedLookups?: ResolvedPreferenceLookups
): string {
  const selfParts = buildSelfDescription(profile);
  const prefParts = buildPartnerPreferenceDescription(partnerPreference, resolvedLookups);

  return [...selfParts, ...prefParts].join(". ");
}
