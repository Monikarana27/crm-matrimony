import { prisma } from "@/lib/db/prisma";

export const IST = "Asia/Kolkata";
export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------- Buckets: every lead ends up in exactly one ----------
export type Bucket =
  | "NEW"
  | "IN_PROGRESS"
  | "CONVERTED"
  | "NOT_INTERESTED"
  | "NOT_REACHABLE"
  | "ALREADY_MATCHED"
  | "OUT_OF_SCOPE"
  | "WRONG_NUMBER"
  | "DUPLICATE"
  | "OTHER";
export type Kind = "good" | "open" | "waste" | "junk" | "neutral";

export const BUCKETS: Record<Bucket, { label: string; kind: Kind; help: string }> = {
  NEW: { label: "New, not yet worked", kind: "open", help: "Waiting for a first call" },
  IN_PROGRESS: { label: "In progress", kind: "open", help: "Being followed up" },
  CONVERTED: { label: "Converted", kind: "good", help: "Became a client" },
  NOT_INTERESTED: { label: "Not interested / lost", kind: "waste", help: "A real person who said no" },
  NOT_REACHABLE: { label: "Not reachable", kind: "waste", help: "Last attempt: no answer, busy or switched off" },
  ALREADY_MATCHED: { label: "Already married / matched", kind: "waste", help: "Found a match elsewhere" },
  OUT_OF_SCOPE: { label: "Out of criteria / budget", kind: "waste", help: "Does not fit what you offer" },
  WRONG_NUMBER: { label: "Wrong / fake number", kind: "junk", help: "Bad data, could never be reached" },
  DUPLICATE: { label: "Duplicate", kind: "junk", help: "Same person entered twice" },
  OTHER: { label: "Unclassified", kind: "neutral", help: "Status text not recognised, see Data quality tab" },
};

// EDIT HERE if a status or outcome of yours lands in the wrong bucket. First match wins.
const RULES: [Bucket, RegExp][] = [
  ["CONVERTED", /convert|\bwon\b|paid|success|registered|enrolled/],
  ["WRONG_NUMBER", /wrong|invalid|incorrect|not exist|fake|spam|junk/],
  ["DUPLICATE", /duplic/],
  ["NOT_INTERESTED", /not interest|declin|reject|no need|dnd|do not call|dont call|lost|closed|cancel|drop/],
  ["ALREADY_MATCHED", /already (married|engaged|matched|found)|(?<!un)married|engaged|matched elsewhere|found match/],
  ["OUT_OF_SCOPE", /criteria|budget|not eligible|out of|age gap|price|expens|fee/],
  ["NOT_REACHABLE", /not reach|unreach|switch|no answer|not pick|not respond|no response|ringing|busy|dnp|call not/],
  ["NEW", /^new$|^open$|^fresh$/],
  ["IN_PROGRESS", /interest|follow|call ?back|meeting|visit|hot|warm|progress|contact|proposal|negotiat|demo|scheduled|pending/],
];

export function classify(text: string): Bucket {
  const t = text.toLowerCase().replace(/[_\-]+/g, " ").trim();
  for (const [b, re] of RULES) if (re.test(t)) return b;
  return "OTHER";
}

const TERMINAL = new Set<Bucket>([
  "CONVERTED",
  "NOT_INTERESTED",
  "NOT_REACHABLE",
  "ALREADY_MATCHED",
  "OUT_OF_SCOPE",
  "WRONG_NUMBER",
  "DUPLICATE",
]);

function stateOf(status: string, lastOutcome: string | null, touched: boolean): Bucket {
  const s = classify(status);
  if (TERMINAL.has(s)) return s;
  if (lastOutcome) {
    const o = classify(lastOutcome);
    if (TERMINAL.has(o)) return o;
  }
  if (touched) return "IN_PROGRESS";
  return s;
}

// ---------- Time helpers (India time) ----------
const istFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

export function istParts(d: Date) {
  const p: Record<string, string> = {};
  for (const part of istFormat.formatToParts(d)) p[part.type] = part.value;
  const ymd = `${p.year ?? ""}-${p.month ?? ""}-${p.day ?? ""}`;
  const dow = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return {
    ymd,
    ym: `${p.year ?? ""}-${p.month ?? ""}`,
    hour: parseInt(p.hour ?? "0", 10) % 24,
    wd: (dow + 6) % 7,
  };
}

export function lastMonths(now: number, k: number) {
  const cur = istParts(new Date(now)).ym;
  let y = parseInt(cur.slice(0, 4), 10);
  let m = parseInt(cur.slice(5, 7), 10);
  const out: { key: string; label: string }[] = [];
  for (let i = 0; i < k; i++) {
    out.unshift({
      key: `${y}-${String(m).padStart(2, "0")}`,
      label: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }),
    });
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

export function lastDays(now: number, k: number) {
  const out: { key: string; label: string }[] = [];
  for (let i = k - 1; i >= 0; i--) {
    const p = istParts(new Date(now - i * DAY_MS));
    out.push({ key: p.ymd, label: `${p.ymd.slice(8)}/${p.ymd.slice(5, 7)}` });
  }
  return out;
}

export const dateLabel = (t: number) =>
  new Date(t).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: IST });

// ---------- Number helpers ----------
export const n0 = (v: number) => v.toLocaleString("en-IN");
export const P = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
export const ps = (a: number, b: number) => `${P(a, b)}%`;

export function median(a: number[]): number | null {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
}

export function fmtDur(ms: number | null) {
  if (ms === null) return "n/a";
  const m = ms / 60000;
  if (m < 60) return `${Math.max(1, Math.round(m))} min`;
  const h = m / 60;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} days`;
}

export function groupBy<T>(items: T[], key: (x: T) => string) {
  const m = new Map<string, T[]>();
  for (const x of items) {
    const k = key(x);
    const a = m.get(k);
    if (a) a.push(x);
    else m.set(k, [x]);
  }
  return m;
}

export const SPEED = [
  { label: "Within 1 hour", max: HOUR_MS },
  { label: "1 to 4 hours", max: 4 * HOUR_MS },
  { label: "4 to 24 hours", max: DAY_MS },
  { label: "1 to 3 days", max: 3 * DAY_MS },
  { label: "Over 3 days", max: Infinity },
];
export const NEVER = "Never contacted";
export function speedLabel(ms: number | null) {
  if (ms === null) return NEVER;
  return (SPEED.find((s) => ms <= s.max) ?? SPEED[SPEED.length - 1]!).label;
}

// ---------- Phone quality ----------
export function normPhone(p: string) {
  let d = p.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}
function phoneLooksValid(raw: string, d: string) {
  if (/^[6-9]\d{9}$/.test(d)) return true;
  return raw.trim().startsWith("+") && d.length >= 8 && d.length <= 15; // overseas numbers
}

// ---------- Website page classification (a guess, edit the word lists if needed) ----------
const COMMUNITY =
  /jat|brahmin|punjabi|agarwal|rajput|khatri|bania|kayastha|yadav|gupta|sikh|muslim|christian|jain|arora|gujjar|maratha|marwari|kshatriya|sindhi|bengali|tamil|telugu|malayali|kannada|gujarati|marathi|odia|hindu|nair|reddy|patel|saini|ramgarhia|dogra|garhwali|kumaoni|maithil|bihari|haryanvi/i;
const NICHE = /nri|divorc|second|remarr|widow|doctor|engineer|premium|elite|service|agency|bureau|consult|free|online|verified|manglik|professional/i;
export function pageTypeOf(page: string | null) {
  if (!page) return "Page not recorded";
  if (/home/i.test(page)) return "Home page";
  if (COMMUNITY.test(page)) return "Community / religion";
  if (NICHE.test(page)) return "Niche / service";
  return "City / state";
}

// ---------- The enriched lead ----------
export type L = {
  id: string;
  t: number;
  source: string;
  channel: string;
  page: string | null;
  isWeb: boolean;
  status: string;
  state: Bucket;
  assignee: string | null;
  phoneOk: boolean;
  dupPhone: boolean;
  hasEmail: boolean;
  hasGender: boolean;
  touches: number;
  firstTouchMs: number | null;
  lastTouch: number;
  repeats: number;
  ymd: string;
  ym: string;
  hour: number;
  wd: number;
};

export const NO_SOURCE = "(no source recorded)";

export async function loadLeads() {
  const [rows, remarks] = await Promise.all([
    prisma.lead.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        createdAt: true,
        source: true,
        status: true,
        phone: true,
        email: true,
        gender: true,
        assignedToId: true,
      },
    }),
    prisma.leadRemark.findMany({
      select: { leadId: true, outcome: true, remark: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  type RM = { n: number; first: number; last: number; lastOutcome: string };
  const rm = new Map<string, RM>();
  const repeatBy = new Map<string, number>();
  const outcomeRaw = new Map<string, number>();
  let repeatTotal = 0;

  for (const r of remarks) {
    const id = String(r.leadId);
    if ((r.remark ?? "").startsWith("New website enquiry")) {
      repeatBy.set(id, (repeatBy.get(id) ?? 0) + 1);
      repeatTotal += 1;
      continue; // automatic note, not a real call by your team
    }
    const t = r.createdAt.getTime();
    const o = String(r.outcome ?? "");
    outcomeRaw.set(o, (outcomeRaw.get(o) ?? 0) + 1);
    const cur = rm.get(id);
    if (!cur) rm.set(id, { n: 1, first: t, last: t, lastOutcome: o });
    else {
      cur.n += 1;
      cur.first = Math.min(cur.first, t);
      if (t >= cur.last) {
        cur.last = t;
        cur.lastOutcome = o;
      }
    }
  }

  const norm = rows.map((r) => normPhone(r.phone ?? ""));
  const phoneCount = new Map<string, number>();
  for (const d of norm) if (d) phoneCount.set(d, (phoneCount.get(d) ?? 0) + 1);

  const statusRaw = new Map<string, number>();
  const leads: L[] = rows.map((r, i) => {
    const id = String(r.id);
    const t = r.createdAt.getTime();
    const src = (r.source ?? "").trim();
    const m = rm.get(id);
    const p = istParts(r.createdAt);
    const isWeb = src.toLowerCase().startsWith("website");
    const pm = src.match(/^website\s*-\s*(.+)$/i);
    const status = String(r.status ?? "");
    statusRaw.set(status, (statusRaw.get(status) ?? 0) + 1);
    const d = norm[i] ?? "";
    return {
      id,
      t,
      source: src,
      channel: src ? (isWeb ? "Website" : src) : NO_SOURCE,
      page: pm && pm[1] ? pm[1].trim() : null,
      isWeb,
      status,
      state: stateOf(status, m?.lastOutcome ?? null, (m?.n ?? 0) > 0),
      assignee: r.assignedToId ? String(r.assignedToId) : null,
      phoneOk: phoneLooksValid(r.phone ?? "", d),
      dupPhone: d !== "" && (phoneCount.get(d) ?? 0) > 1,
      hasEmail: !!(r.email ?? "").trim(),
      hasGender: !!r.gender,
      touches: m?.n ?? 0,
      firstTouchMs: m ? Math.max(0, m.first - t) : null,
      lastTouch: m ? m.last : t,
      repeats: repeatBy.get(id) ?? 0,
      ymd: p.ymd,
      ym: p.ym,
      hour: p.hour,
      wd: p.wd,
    };
  });

  return { leads, statusRaw, outcomeRaw, repeatTotal };
}

// Staff names: tries the usual tables, falls back to a short id if none match.
type NameRow = { id: unknown; name?: unknown };
type NameModel = { findMany: (a: unknown) => Promise<NameRow[]> };

export async function loadNames(ids: string[]) {
  const out = new Map<string, string>();
  if (!ids.length) return out;
  const db = prisma as unknown as Record<string, NameModel | undefined>;
  for (const model of ["user", "employee"]) {
    try {
      const rows = await db[model]?.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
      for (const r of rows ?? []) if (r && r.name) out.set(String(r.id), String(r.name));
      if (out.size) break;
    } catch {
      /* try next */
    }
  }
  return out;
}

// ---------- Aggregates ----------
export function bucketCounts(ls: L[]) {
  const b = Object.fromEntries(Object.keys(BUCKETS).map((k) => [k, 0])) as Record<Bucket, number>;
  for (const l of ls) b[l.state] += 1;
  return b;
}
export function kindTotal(b: Record<Bucket, number>, kinds: Kind[]) {
  let t = 0;
  for (const k of Object.keys(b) as Bucket[]) if (kinds.includes(BUCKETS[k].kind)) t += b[k];
  return t;
}
export const isLost = (l: L) => {
  const k = BUCKETS[l.state].kind;
  return k === "waste" || k === "junk";
};
export const isOpen = (l: L) => {
  const k = BUCKETS[l.state].kind;
  return k === "open" || k === "neutral";
};
export const isConv = (l: L) => l.state === "CONVERTED";
