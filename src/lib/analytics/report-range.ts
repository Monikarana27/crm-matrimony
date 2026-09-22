import { DAY_MS, istParts } from "./lead-model";

const IST_OFFSET = 19_800_000; // +05:30, India has no daylight saving

export type Group = "day" | "week" | "month";

export const PRESETS: [string, string][] = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["month", "This month"],
  ["lastmonth", "Last month"],
  ["quarter", "This quarter"],
  ["fy", "This financial year (Apr to Mar)"],
  ["custom", "Custom dates"],
];

export const isYmd = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(`${s}T00:00:00Z`));
export const ymdStartMs = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`) - IST_OFFSET;
export const addDays = (ymd: string, k: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + k * DAY_MS).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);

const pad = (n: number) => String(n).padStart(2, "0");
const monthStart = (y: number, m: number) => `${y}-${pad(m)}-01`;

export function resolveRange(preset: string, fromQ: string | undefined, toQ: string | undefined, now: number) {
  const today = istParts(new Date(now)).ymd;
  const y = parseInt(today.slice(0, 4), 10);
  const m = parseInt(today.slice(5, 7), 10);
  let from = today;
  let to = today;
  switch (preset) {
    case "today":
      break;
    case "yesterday":
      from = addDays(today, -1);
      to = from;
      break;
    case "7d":
      from = addDays(today, -6);
      break;
    case "month":
      from = monthStart(y, m);
      break;
    case "lastmonth":
      from = m === 1 ? monthStart(y - 1, 12) : monthStart(y, m - 1);
      to = addDays(monthStart(y, m), -1);
      break;
    case "quarter":
      from = monthStart(y, Math.floor((m - 1) / 3) * 3 + 1);
      break;
    case "fy":
      from = monthStart(m >= 4 ? y : y - 1, 4);
      break;
    case "custom":
      if (isYmd(fromQ) && isYmd(toQ)) {
        from = fromQ as string;
        to = toQ as string;
        if (from > to) [from, to] = [to, from];
      } else {
        from = addDays(today, -29);
      }
      break;
    default:
      from = addDays(today, -29);
  }
  return { from, to };
}

export function weekStart(ymd: string) {
  const wd = (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(ymd, -wd);
}
export const keyOf = (ymd: string, g: Group) => (g === "day" ? ymd : g === "week" ? weekStart(ymd) : ymd.slice(0, 7));

export function groupKeys(from: string, to: string, g: Group) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const k = keyOf(d, g);
    if (out[out.length - 1] !== k) out.push(k);
  }
  return out;
}

export function keyLabel(k: string, g: Group) {
  if (g === "month") return new Date(`${k}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  const d = new Date(`${k}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
  return g === "week" ? `Week of ${d}` : d;
}
