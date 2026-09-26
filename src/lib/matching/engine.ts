// Explainable rule-based matching engine. Pure functions: no DB access, no AI service.
//
// How it works:
//  1. Hard filters: only clear, known mismatches on marital status, religion and age
//     (more than AGE_TOLERANCE years outside the range) exclude a candidate.
//     Missing data is never a mismatch.
//  2. Soft criteria: weighted partial credit (location, income, education, height, caste...).
//     Only criteria the client actually specified count ("Open to all"/blank are skipped).
//  3. Two-way fit: client's preferences vs candidate, blended with the candidate's
//     preferences vs the client.
//  4. Implicit similarity (same religion/caste/language/city, education, natural age gap)
//     and profile completeness break ties when preferences are sparse.

type Row = any;

export type Lookups = {
  religion: Map<string, string>;
  caste: Map<string, string>;
  tongue: Map<string, string>;
};

export type RankedMatch = {
  id: string;
  name: string;
  profileCode: string;
  city: string | null;
  religion: string | null;
  score: number;
  tier: "Excellent" | "Good" | "Fair" | "Low";
  reasons: string[];
  gaps: string[];
  age: number | null;
  profession: string | null;
  alreadySent: boolean;
};

const AGE_TOLERANCE = 3;
const OPEN_TOKENS = new Set(["open to all", "open to any", "any", "doesn't matter", "doesnt matter", "no preference"]);

const W = {
  age: 14, height: 5, marital: 9, religion: 14, caste: 11, tongue: 6, manglik: 5,
  education: 8, profession: 4, income: 8, location: 10, diet: 4, drinking: 1, smoking: 1, visaStatus: 3,
};

const EDU_LEVEL: Record<string, number> = {
  "no formal education": 0,
  "primary school": 1,
  "high school (10th)": 2,
  "higher secondary (12th)": 3,
  "diploma / iti": 4,
  "bachelor degree": 5,
  "master degree": 6,
  "doctorate / phd": 7,
  "professional course (ca / cs / etc.)": 6,
};

// ---------- small helpers ----------

const norm = (v: unknown): string => String(v ?? "").trim().toLowerCase();
const nz = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};

function rawStrings(val: unknown): string[] {
  if (val === null || val === undefined) return [];
  let raw: string[];
  if (Array.isArray(val)) raw = val.map(String);
  else {
    const s = String(val);
    try {
      const p = JSON.parse(s);
      raw = Array.isArray(p) ? p.map(String) : [String(p)];
    } catch {
      raw = [s];
    }
  }
  return raw.map((x) => x.trim()).filter(Boolean);
}

function splitTokens(val: unknown): string[] {
  return rawStrings(val).flatMap((v) => v.split(",")).map(norm).filter(Boolean);
}

/** Merges list-ish preference values into lowercase tokens; null = open / no restriction. */
function prefList(...vals: unknown[]): string[] | null {
  const all: string[] = [];
  for (const v of vals) {
    const toks = splitTokens(v);
    if (toks.some((t) => OPEN_TOKENS.has(t))) return null;
    all.push(...toks);
  }
  return all.length ? Array.from(new Set(all)) : null;
}

function fuzzyHas(list: string[], value: string | null): boolean {
  const v = norm(value);
  if (!v) return false;
  return list.some((t) => t === v || (t.length >= 3 && v.length >= 3 && (t.includes(v) || v.includes(t))));
}

function exactHas(list: string[], value: string | null): boolean {
  const v = norm(value);
  return !!v && list.includes(v);
}

function ageOf(dob: unknown): number | null {
  if (!dob) return null;
  const d = new Date(dob as any);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age < 16 || age > 90 ? null : age;
}

function heightCm(v: unknown): number | null {
  const s = String(v ?? "");
  const cm = s.match(/(\d{3})\s*cm/i);
  if (cm) return parseInt(cm[1], 10);
  const ft = s.match(/(\d)\s*(?:ft|')\s*(\d{1,2})?/i);
  if (ft) return Math.round((parseInt(ft[1], 10) * 12 + parseInt(ft[2] ?? "0", 10)) * 2.54);
  return null;
}

function eduLevel(v: unknown): number | null {
  let best: number | null = null;
  for (const p of String(v ?? "").split(",").map(norm).filter(Boolean)) {
    const l = EDU_LEVEL[p];
    if (l !== undefined && (best === null || l > best)) best = l;
  }
  return best;
}

function normMarital(v: unknown): string | null {
  const s = norm(v);
  if (!s) return null;
  return s === "single" ? "never married" : s;
}

function incomeBounds(label: unknown): { low: number; high: number } | null {
  const s = norm(label);
  if (!s || s.includes("prefer not")) return null;
  const unitAll = s.match(/lakh|crore/)?.[0] ?? null;
  const value = (part: string): number | null => {
    const m = part.match(/(\d[\d,]*\.?\d*)\s*(lakh|crore)?/);
    if (!m) return null;
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (isNaN(n)) return null;
    const unit = m[2] ?? unitAll;
    return unit === "crore" ? n * 1e7 : unit === "lakh" ? n * 1e5 : n;
  };
  const parts = s.split("-");
  if (s.startsWith("below")) {
    const v = value(s);
    return v === null ? null : { low: 0, high: v };
  }
  if (s.startsWith("above")) {
    const v = value(s);
    return v === null ? null : { low: v, high: Infinity };
  }
  const a = value(parts[0]);
  const b = parts.length > 1 ? value(parts[1]) : a;
  if (a === null) return null;
  return { low: a, high: b ?? a };
}

// ---------- normalized shapes ----------

type Attrs = {
  gender: string | null;
  age: number | null;
  heightCm: number | null;
  heightLabel: string | null;
  marital: string | null;
  religion: string | null;
  caste: string | null;
  tongue: string | null;
  manglik: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  education: string | null;
  eduLevel: number | null;
  profession: string | null;
  income: string | null;
  incomeCurrency: string | null;
  diet: string | null;
  drinking: string | null;
  smoking: string | null;
  visaStatus: string | null;
  hasPhoto: boolean;
};

function attrsOf(row: Row, lk: Lookups): Attrs {
  return {
    gender: nz(row.gender),
    age: ageOf(row.dob),
    heightCm: heightCm(row.height),
    heightLabel: nz(row.height)?.split("-")[0].trim() ?? null,
    marital: nz(row.maritalStatus),
    religion: nz(lk.religion.get(row.religionId) ?? row.religionOld),
    caste: nz(lk.caste.get(row.casteId) ?? row.casteOld),
    tongue: nz(lk.tongue.get(row.motherTongueId) ?? row.motherTongueOld),
    manglik: nz(row.manglik),
    country: nz(row.country),
    state: nz(row.state),
    city: nz(row.city),
    education: nz(row.highestQualification),
    eduLevel: eduLevel(row.highestQualification),
    profession: nz(row.profession),
    income: nz(row.annualIncome),
    incomeCurrency: nz(row.annualIncomeCurrency),
    diet: nz(row.diet),
    drinking: nz(row.drinking),
    smoking: nz(row.smoking),
    visaStatus: nz(row.visaStatus),
    hasPhoto: !!row.photoUrl,
  };
}

type Pref = {
  minAge: number | null;
  maxAge: number | null;
  minHeight: number | null;
  maxHeight: number | null;
  marital: string[] | null;
  religion: string[] | null;
  caste: string[] | null;
  tongue: string[] | null;
  manglik: string[] | null;
  countries: string[] | null;
  states: string[] | null;
  cities: string[] | null;
  education: string[] | null;
  professions: string[] | null;
  income: { min: number; currency: string | null } | null;
  diet: string[] | null;
  drinking: string[] | null;
  smoking: string[] | null;
  visaStatus: string[] | null;
};

function normalizePref(pp: Row | null, lk: Lookups): Pref {
  const p: Row = pp ?? {};
  const names = (ids: unknown, map: Map<string, string>): string[] =>
    Array.isArray(ids)
      ? ids.map((id) => map.get(String(id)) ?? (OPEN_TOKENS.has(norm(id)) ? String(id) : "")).filter(Boolean)
      : [];
  const one = (id: unknown, map: Map<string, string>): string[] => (id ? [map.get(String(id)) ?? ""] : []);

  // Income: keep raw strings (range labels contain commas), open marker = no restriction.
  const rawIncome = [...rawStrings(p.annualIncomeRanges), ...rawStrings(p.annualIncome)];
  let income: Pref["income"] = null;
  if (!rawIncome.some((r) => OPEN_TOKENS.has(norm(r)))) {
    const lows = rawIncome.map(incomeBounds).filter((b): b is { low: number; high: number } => b !== null).map((b) => b.low);
    if (lows.length) income = { min: Math.min(...lows), currency: nz(p.annualIncomeCurrency) };
  }

  return {
    minAge: typeof p.minAge === "number" ? p.minAge : null,
    maxAge: typeof p.maxAge === "number" ? p.maxAge : null,
    minHeight: heightCm(p.minHeight),
    maxHeight: heightCm(p.maxHeight),
    marital: prefList(p.maritalStatusMulti, p.maritalStatus),
    religion: prefList(names(p.religionIds, lk.religion), one(p.religionId, lk.religion), p.religionOld),
    caste: prefList(names(p.casteIds, lk.caste), one(p.casteId, lk.caste), p.casteOld),
    tongue: prefList(names(p.motherTongueIds, lk.tongue), one(p.motherTongueId, lk.tongue), p.motherTongueOld),
    manglik: prefList(p.manglikStatusMulti, p.manglikStatus),
    countries: prefList(p.countryMulti, p.country),
    states: prefList(p.stateMulti, p.state),
    cities: prefList(p.cityMulti, p.city),
    education: prefList(p.qualificationMulti, p.qualification),
    professions: prefList(p.professionMulti, p.profession),
    income,
    diet: prefList(p.dietMulti, p.diet),
    drinking: prefList(p.drinkingMulti, p.drinking),
    smoking: prefList(p.smokingMulti, p.smoking),
    visaStatus: prefList(p.visaStatusMulti),
  };
}

// ---------- one-direction scoring ----------

type Status = "match" | "partial" | "mismatch" | "unknown";
type Criterion = { key: string; weight: number; score: number; status: Status; text: string };
type DirResult = { fit: number | null; hardFail: string | null; criteria: Criterion[] };

function rangeText(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${min}–${max}`;
  if (min !== null) return `${min}+`;
  return `up to ${max}`;
}

function scoreDirection(pref: Pref, c: Attrs, strict: boolean): DirResult {
  const criteria: Criterion[] = [];
  let hardFail: string | null = null;
  const add = (key: string, weight: number, score: number, status: Status, text: string) =>
    criteria.push({ key, weight, score, status, text });

  // Age
  if (pref.minAge !== null || pref.maxAge !== null) {
    if (c.age === null) add("age", W.age, 0.5, "unknown", "Age not given");
    else {
      const lo = pref.minAge ?? -Infinity;
      const hi = pref.maxAge ?? Infinity;
      const d = c.age < lo ? lo - c.age : c.age > hi ? c.age - hi : 0;
      const range = rangeText(pref.minAge, pref.maxAge);
      if (d === 0) add("age", W.age, 1, "match", `Age ${c.age}, within ${range}`);
      else if (!strict) add("age", W.age, Math.max(0, 1 - 0.2 * d), "partial", `Age ${c.age}, ${d} yr outside ${range}`);
      else if (d <= AGE_TOLERANCE) add("age", W.age, 1 - 0.25 * d, "partial", `Age ${c.age}, ${d} yr outside ${range}`);
      else {
        hardFail = `Age ${c.age} is ${d} years outside ${range}`;
        add("age", W.age, 0, "mismatch", hardFail);
      }
    }
  }

  // Height
  if (pref.minHeight !== null || pref.maxHeight !== null) {
    if (c.heightCm === null) add("height", W.height, 0.5, "unknown", "Height not given");
    else {
      const lo = pref.minHeight ?? -Infinity;
      const hi = pref.maxHeight ?? Infinity;
      const d = c.heightCm < lo ? lo - c.heightCm : c.heightCm > hi ? c.heightCm - hi : 0;
      if (d === 0) add("height", W.height, 1, "match", `Height ${c.heightLabel ?? c.heightCm + "cm"}`);
      else {
        const s = d <= 2 ? 0.85 : d <= 5 ? 0.6 : d <= 10 ? 0.35 : 0.1;
        add("height", W.height, s, d <= 5 ? "partial" : "mismatch", `Height ${c.heightLabel ?? c.heightCm + "cm"}, ${d}cm off`);
      }
    }
  }

  // Marital status (strict)
  if (pref.marital) {
    const m = normMarital(c.marital);
    if (!m) add("marital", W.marital, 0.5, "unknown", "Marital status not given");
    else if (pref.marital.map((x) => normMarital(x)).includes(m)) add("marital", W.marital, 1, "match", `${c.marital}`);
    else {
      if (strict) hardFail = `Marital status ${c.marital} not preferred`;
      add("marital", W.marital, 0, "mismatch", `Marital status is ${c.marital}`);
    }
  }

  // Religion (strict)
  if (pref.religion) {
    if (!c.religion) add("religion", W.religion, 0.5, "unknown", "Religion not given");
    else if (fuzzyHas(pref.religion, c.religion)) add("religion", W.religion, 1, "match", `Religion: ${c.religion}`);
    else {
      if (strict) hardFail = `Religion ${c.religion} not preferred`;
      add("religion", W.religion, 0, "mismatch", `Religion is ${c.religion}`);
    }
  }

  // Caste (soft, heavy)
  if (pref.caste) {
    if (!c.caste) add("caste", W.caste, 0.5, "unknown", "Caste not given");
    else if (fuzzyHas(pref.caste, c.caste)) add("caste", W.caste, 1, "match", `Caste: ${c.caste}`);
    else add("caste", W.caste, 0.15, "mismatch", `Caste is ${c.caste}`);
  }

  // Mother tongue (strict) — hard filter when strict: a client-specified mother
  // tongue preference that the candidate doesn't match excludes them, same as
  // religion/marital above, instead of only softly penalizing the blended score.
  if (pref.tongue) {
    if (!c.tongue) add("tongue", W.tongue, 0.5, "unknown", "Mother tongue not given");
    else if (fuzzyHas(pref.tongue, c.tongue)) add("tongue", W.tongue, 1, "match", `Mother tongue: ${c.tongue}`);
    else {
      if (strict) hardFail = `Mother tongue ${c.tongue} not preferred`;
      add("tongue", W.tongue, 0.2, "mismatch", `Mother tongue is ${c.tongue}`);
    }
  }

  // Manglik
  if (pref.manglik) {
    const m = norm(c.manglik);
    if (!m || m === "don't know") add("manglik", W.manglik, 0.5, "unknown", "Manglik status unknown");
    else if (exactHas(pref.manglik, c.manglik)) add("manglik", W.manglik, 1, "match", `Manglik: ${c.manglik}`);
    else if (m === "partial" || m === "anshik manglik") add("manglik", W.manglik, 0.5, "partial", `Manglik: ${c.manglik}`);
    else add("manglik", W.manglik, 0, "mismatch", `Manglik: ${c.manglik}`);
  }

  // Education (meets or exceeds the lowest preferred level)
  if (pref.education) {
    const levels = pref.education.map((e) => EDU_LEVEL[e]).filter((l): l is number => l !== undefined);
    if (levels.length) {
      const minLevel = Math.min(...levels);
      if (c.eduLevel === null) add("education", W.education, 0.5, "unknown", "Education not given");
      else if (c.eduLevel >= minLevel) add("education", W.education, 1, "match", `Education: ${c.education}`);
      else if (c.eduLevel === minLevel - 1) add("education", W.education, 0.5, "partial", `Education: ${c.education}, one level below`);
      else add("education", W.education, 0.15, "mismatch", `Education: ${c.education}`);
    }
  }

  // Profession
  if (pref.professions) {
    if (!c.profession) add("profession", W.profession, 0.5, "unknown", "Profession not given");
    else if (fuzzyHas(pref.professions, c.profession)) add("profession", W.profession, 1, "match", `Profession: ${c.profession}`);
    else add("profession", W.profession, 0.3, "mismatch", `Profession: ${c.profession}`);
  }

  // Income (lower bound of the preferred ranges; only comparable when currencies agree)
  if (pref.income) {
    const b = incomeBounds(c.income);
    const candCur = norm(c.incomeCurrency) || (norm(c.income).includes("₹") ? "inr" : "");
    const prefCur = norm(pref.income.currency);
    if (!b) add("income", W.income, 0.5, "unknown", "Income not disclosed");
    else if (candCur && prefCur && candCur !== prefCur) add("income", W.income, 0.5, "unknown", "Income in a different currency");
    else if (b.low >= pref.income.min) add("income", W.income, 1, "match", `Income: ${c.income}`);
    else if (b.high >= pref.income.min) add("income", W.income, 0.6, "partial", `Income: ${c.income}, overlaps preferred`);
    else add("income", W.income, 0.15 + 0.35 * Math.max(0, Math.min(1, b.high / pref.income.min)), "mismatch", `Income: ${c.income}, below preferred`);
  }

  // Location (city > state > country) — hard filter when strict: a client-specified
  // location preference that matches at no level (city, state, or country) excludes
  // the candidate, same as religion/marital above, instead of only softly penalizing
  // the blended score. This is what makes e.g. a Netherlands-only preference actually
  // exclude Mumbai-based candidates instead of just ranking them lower.
  if (pref.countries || pref.states || pref.cities) {
    const place = [c.city, c.state, c.country].filter(Boolean).join(", ");
    if (!c.city && !c.state && !c.country) add("location", W.location, 0.5, "unknown", "Location not given");
    else {
      let s = 0.05;
      let status: Status = "mismatch";
      if (pref.cities && fuzzyHas(pref.cities, c.city)) { s = 1; status = "match"; }
      else if (pref.states && fuzzyHas(pref.states, c.state)) { s = pref.cities ? 0.7 : 1; status = pref.cities ? "partial" : "match"; }
      else if (pref.countries && fuzzyHas(pref.countries, c.country)) { s = pref.cities || pref.states ? 0.45 : 1; status = pref.cities || pref.states ? "partial" : "match"; }
      if (status === "mismatch" && strict) {
        hardFail = `Location ${place} not in preferred ${pref.cities ? "cities" : pref.states ? "states" : "countries"}`;
      }
      add("location", W.location, s, status, `Lives in ${place}`);
    }
  }

  // Lifestyle
  if (pref.diet) {
    const d = norm(c.diet);
    if (!d) add("diet", W.diet, 0.5, "unknown", "Diet not given");
    else if (pref.diet.includes(d)) add("diet", W.diet, 1, "match", `Diet: ${c.diet}`);
    else if (pref.diet.includes("vegetarian") && (d === "eggetarian" || d === "vegan")) add("diet", W.diet, d === "vegan" ? 0.9 : 0.6, "partial", `Diet: ${c.diet}`);
    else if (pref.diet.includes("non-vegetarian") && d === "occasionally non-veg") add("diet", W.diet, 0.7, "partial", `Diet: ${c.diet}`);
    else add("diet", W.diet, pref.diet.includes("vegetarian") ? 0.05 : 0.2, "mismatch", `Diet: ${c.diet}`);
  }
  for (const key of ["drinking", "smoking"] as const) {
    const list = pref[key];
    if (!list) continue;
    const v = norm(c[key]);
    if (!v) add(key, W[key], 0.5, "unknown", `${key === "drinking" ? "Drinking" : "Smoking"} not given`);
    else if (list.includes(v)) add(key, W[key], 1, "match", `${key === "drinking" ? "Drinking" : "Smoking"}: ${c[key]}`);
    else add(key, W[key], 0.3, "mismatch", `${key === "drinking" ? "Drinking" : "Smoking"}: ${c[key]}`);
  }

  if (pref.visaStatus) {
    const v = norm(c.visaStatus);
    if (!v) add("visaStatus", W.visaStatus, 0.5, "unknown", "Visa status not given");
    else if (pref.visaStatus.includes(v)) add("visaStatus", W.visaStatus, 1, "match", `Visa Status: ${c.visaStatus}`);
    else add("visaStatus", W.visaStatus, 0.3, "mismatch", `Visa Status: ${c.visaStatus}`);
  }

  const totalW = criteria.reduce((s, x) => s + x.weight, 0);
  const fit = totalW > 0 ? criteria.reduce((s, x) => s + x.weight * x.score, 0) / totalW : null;
  return { fit, hardFail, criteria };
}

// ---------- implicit similarity and profile quality ----------

function affinity(client: Attrs, c: Attrs): { score: number; notes: string[] } {
  const parts: { w: number; s: number }[] = [];
  const notes: string[] = [];
  const cmp = (w: number, a: string | null, b: string | null, note: string) => {
    if (!norm(a) || !norm(b)) return;
    const same = norm(a) === norm(b);
    parts.push({ w, s: same ? 1 : 0 });
    if (same) notes.push(note);
  };
  cmp(0.25, client.religion, c.religion, `Same religion (${c.religion})`);
  cmp(0.2, client.caste, c.caste, `Same caste (${c.caste})`);
  cmp(0.12, client.tongue, c.tongue, `Same mother tongue (${c.tongue})`);

  if (norm(client.city) && norm(c.city)) {
    const same = norm(client.city) === norm(c.city);
    parts.push({ w: 0.2, s: same ? 1 : norm(client.state) && norm(client.state) === norm(c.state) ? 0.6 : 0 });
    if (same) notes.push(`Same city (${c.city})`);
  } else if (norm(client.state) && norm(c.state)) {
    parts.push({ w: 0.2, s: norm(client.state) === norm(c.state) ? 0.6 : 0 });
  }

  if (client.eduLevel !== null && c.eduLevel !== null) {
    const d = Math.abs(client.eduLevel - c.eduLevel);
    parts.push({ w: 0.1, s: d === 0 ? 1 : d === 1 ? 0.6 : d === 2 ? 0.3 : 0 });
  }
  if (client.age !== null && c.age !== null && client.gender) {
    // Typical pairing: the man is 0-5 years older.
    const ahead = client.gender === "FEMALE" ? c.age - client.age : client.age - c.age;
    const dist = ahead < 0 ? -ahead : ahead > 5 ? ahead - 5 : 0;
    parts.push({ w: 0.13, s: Math.max(0, 1 - 0.15 * dist) });
  }
  const tw = parts.reduce((s, p) => s + p.w, 0);
  // Unknown fields count as neutral (0.4), not skipped, so a sparse profile can't score 100%.
  const missing = Math.max(0, 1 - tw);
  return { score: parts.reduce((s, p) => s + p.w * p.s, 0) + 0.4 * missing, notes };
}

function quality(c: Attrs): number {
  const known = [
    c.age, c.heightCm, c.marital, c.religion, c.caste, c.eduLevel, c.profession,
    c.income && !norm(c.income).includes("prefer not") ? c.income : null, c.city, c.diet,
  ].filter((v) => v !== null && v !== undefined).length;
  return 0.8 * (known / 10) + (c.hasPhoto ? 0.2 : 0);
}

// ---------- ranking ----------

export function rankMatches(
  client: Row,
  candidates: Row[],
  lk: Lookups,
  sentIds: Set<string>,
  limit = 60
): RankedMatch[] {
  const clientAttrs = attrsOf(client, lk);
  const clientPref = normalizePref(client.partnerPreference, lk);
  const out: (RankedMatch & { _p: number })[] = [];

  for (const row of candidates) {
    const attrs = attrsOf(row, lk);
    const fwd = scoreDirection(clientPref, attrs, true);
    if (fwd.hardFail) continue;

    const rev = scoreDirection(normalizePref(row.partnerPreference, lk), clientAttrs, false);
    const aff = affinity(clientAttrs, attrs);
    const final = 0.55 * (fwd.fit ?? 0.7) + 0.2 * (rev.fit ?? 0.7) + 0.15 * aff.score + 0.1 * quality(attrs);
    const percent = Math.round(Math.max(0, Math.min(1, final)) * 100);

    const byWeight = (a: Criterion, b: Criterion) => b.weight - a.weight;
    const good = fwd.criteria.filter((x) => x.status === "match" || x.status === "partial").sort(byWeight).map((x) => x.text);
    const bad = fwd.criteria.filter((x) => x.status === "mismatch" || x.status === "unknown").sort(byWeight).map((x) => x.text);
    const reasons = [...good, ...aff.notes.filter((n) => !good.some((g) => g.toLowerCase().includes(n.split(" ")[1] ?? "~")))].slice(0, 4);
    const gaps = bad.slice(0, 3);
    const theirs = rev.criteria.find((x) => x.status === "mismatch");
    if (theirs && gaps.length < 4) gaps.push(`Outside their own preference for ${theirs.key}`);

    out.push({
      id: row.id,
      name: row.name,
      profileCode: row.profileCode,
      city: attrs.city,
      religion: attrs.religion,
      score: percent,
      tier: percent >= 82 ? "Excellent" : percent >= 68 ? "Good" : percent >= 55 ? "Fair" : "Low",
      reasons,
      gaps,
      age: attrs.age,
      profession: attrs.profession,
      alreadySent: sentIds.has(row.id),
      _p: final,
    });
  }

  out.sort((a, b) => Number(a.alreadySent) - Number(b.alreadySent) || b._p - a._p);
  return out.slice(0, limit).map(({ _p, ...rest }) => rest);
}
