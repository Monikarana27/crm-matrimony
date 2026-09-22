// Pure scoring logic — deliberately NOT a server action (no "use server"),
// since this never touches the database. Just takes data in, returns
// scored data out.
//
// Weights reflect real matchmaking priority in the Indian context:
// caste and religion are typically the most decisive factors after the
// hard filters, income/profession matter a lot, city matters least
// (many clients are open to relocation).
//
// AI UPDATE: added an embedding-similarity component (semanticScore) so
// matches aren't purely exact-field-overlap anymore — a candidate whose
// overall bio/lifestyle reads similarly to the client's now gets credit
// even if a specific field (profession, city) doesn't match exactly.
//
// UPDATED for master-data normalization: caste/religion are now compared by
// ID (religionId/casteId) instead of free-text name.
//
// FIX (round 3): sorting was using the rounded display score, which
// collapses similarities within ~0.03 of each other into the same integer.
// Since sort() is stable, ties fell back to arbitrary insertion order —
// verified against real data: a candidate with the HIGHEST similarity in a
// test batch landed LAST because of this. Now sorts by full-precision score
// internally and only rounds the value actually returned/displayed.
//
// FIX (round 2): baseline dropped 30→20. With "open to all" preference
// fields awarding full credit (round 1), a client whose preferences are
// mostly "open" could reach 90 from field weights alone before any semantic
// bonus, and capping at 100 made every such candidate hit the ceiling
// regardless of similarity. Max non-semantic total is now 80, leaving the
// full 20-point semantic band as real headroom.
//
// FIX (round 1): two issues found while testing against a real profile
// (Abhishek Gupta) whose partnerPreference was mostly "Open to All":
//   1. "Open to All" / empty preference values were compared as literal
//      strings and never matched a candidate's real value — silently
//      contributing 0 points instead of "client doesn't care, give credit".
//   2. Preference fields that are JSON-stringified arrays (city,
//      annualIncome) were compared as raw strings against plain candidate
//      values and could never match. Now parsed before comparing.

type ScorableProfile = {
  id: string;
  city: string | null;
  religionId: string | null;
  casteId: string | null;
  profession: string | null;
  annualIncome: string | null;
};

type PreferenceForScoring = {
  city?: string | null;
  religionId?: string | null;
  casteId?: string | null;
  profession?: string | null;
  annualIncome?: string | null;
} | null;

const SEMANTIC_WEIGHT = 20; // max points contributed by embedding similarity

const OPEN_VALUES = new Set(["open to all", "open to any", ""]);

/** Parses a preference field that may be a plain string or a JSON-stringified
 * array (e.g. '["Lucknow,Noida,Greater Noida"]'), returning normalized,
 * lowercased tokens. Also splits on commas since some fields store
 * multi-value strings inside a single array element. */
function parsePreferenceValues(val: string | null | undefined): string[] {
  if (!val) return [];
  let raw: string[];
  try {
    const parsed = JSON.parse(val);
    raw = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    raw = [val];
  }
  return raw
    .flatMap((v) => v.split(","))
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function isOpenPreference(values: string[]): boolean {
  return values.length === 0 || values.every((v) => OPEN_VALUES.has(v));
}

/** Scores a field: full weight if the client has no real preference (open to
 * all / empty), full weight if the candidate's value is among the preferred
 * values, otherwise 0. */
function scoreField(
  prefRaw: string | null | undefined,
  candidateValue: string | null,
  weight: number
): number {
  const prefValues = parsePreferenceValues(prefRaw);
  if (isOpenPreference(prefValues)) return weight;
  if (!candidateValue) return 0;
  return prefValues.includes(candidateValue.trim().toLowerCase()) ? weight : 0;
}

export function scoreAndRank<T extends ScorableProfile>(
  candidates: T[],
  preference: PreferenceForScoring,
  similarityMap: Record<string, number> = {}
): (T & { score: number; semanticSimilarity: number | null })[] {
  const scored = candidates.map((candidate) => {
    let score = 20; // baseline — candidate already passed hard filters to get here

    // Caste/religion are compared by ID directly (not free text), so "open"
    // just means the preference ID is null/undefined — no string parsing needed.
    if (!preference?.casteId) score += 20;
    else if (candidate.casteId === preference.casteId) score += 20;

    if (!preference?.religionId) score += 15;
    else if (candidate.religionId === preference.religionId) score += 15;

    score += scoreField(preference?.annualIncome, candidate.annualIncome, 10);
    score += scoreField(preference?.profession, candidate.profession, 10);
    score += scoreField(preference?.city, candidate.city, 5);

    const similarity = similarityMap[candidate.id] ?? null;
    if (similarity !== null) {
      // Full precision here — this is what determines sort order below.
      score += similarity * SEMANTIC_WEIGHT;
    }

    const preciseScore = Math.min(score, 100);

    return {
      ...candidate,
      score: Math.min(Math.round(score), 100),
      preciseScore,
      semanticSimilarity: similarity,
    };
  });

  scored.sort((a, b) => b.preciseScore - a.preciseScore);

  // preciseScore only exists to drive the sort above and was never part of
  // the declared return type — stripped here via destructuring, asserted
  // back to the declared shape since TS can't verify the Omit against a
  // generic T on its own.
  return scored.map(({ preciseScore, ...rest }) => rest) as (T & {
    score: number;
    semanticSimilarity: number | null;
  })[];
}
