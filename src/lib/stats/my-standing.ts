import { prisma } from "@/lib/db/prisma";
import { addDaysISO, getStaffHistory, istToday, type StaffTeam } from "@/lib/stats/staff-history";

const LOOKBACK_DAYS = 120;
const MIN_POOL_TO_RANK = 3;
const MIN_POOL_FOR_TOP3 = 5;
const MIN_PRIOR_DAYS_FOR_BEST = 3;

type Pool = { team: StaffTeam; label: string; roles: string[] };

function poolFor(role: string): Pool | null {
  switch (role) {
    case "SALES":
      return { team: "sales", label: "sales team", roles: ["SALES"] };
    case "SALES_TL":
    case "SALES_MANAGER":
      return { team: "sales", label: "sales leads", roles: ["SALES_TL", "SALES_MANAGER"] };
    case "SERVICE":
      return { team: "service", label: "service team", roles: ["SERVICE"] };
    case "SERVICE_TL":
    case "SERVICE_MANAGER":
      return { team: "service", label: "service leads", roles: ["SERVICE_TL", "SERVICE_MANAGER"] };
    case "SME":
      return { team: "service", label: "service team", roles: [] };
    case "PROFILE_CREATOR":
      return { team: "profile", label: "profile team", roles: ["PROFILE_CREATOR"] };
    default:
      return null;
  }
}

export type PeriodStanding = {
  points: number;
  rank: number | null;
  of: number | null;
  toNext: number | null;
};

export type MyStanding = {
  poolLabel: string;
  today: PeriodStanding;
  week: PeriodStanding;
  month: PeriodStanding;
  streak: number;
  badges: { topToday: boolean; top3Week: boolean; personalBest: boolean };
  bestDayPoints: number;
};

export async function getMyStanding(userId: string): Promise<MyStanding | null> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isSME: true },
  });
  if (!me) return null;
  const pool = poolFor(me.role);
  if (!pool) return null;

  const today = istToday();
  const from = addDaysISO(today, -LOOKBACK_DAYS);
  const { summaries, cells } = await getStaffHistory({ team: pool.team, from, to: today });

  const recentFrom = addDaysISO(today, -30);
  const recent = new Set<string>();
  for (const [day, byUser] of Object.entries(cells)) {
    if (day < recentFrom) continue;
    for (const [id, c] of Object.entries(byUser)) if (c.points > 0) recent.add(id);
  }
  const memberIds = summaries
    .filter((s) => s.active && !s.isSME && pool.roles.includes(s.role) && recent.has(s.id))
    .map((s) => s.id);
  const canRank =
    !me.isSME && memberIds.includes(userId) && memberIds.length >= MIN_POOL_TO_RANK;

  const totals = (start: string, ids: string[]) => {
    const t = new Map<string, number>(ids.map((i) => [i, 0]));
    for (const [day, byUser] of Object.entries(cells)) {
      if (day < start || day > today) continue;
      for (const id of ids) t.set(id, (t.get(id) ?? 0) + (byUser[id]?.points ?? 0));
    }
    return t;
  };

  const period = (start: string): PeriodStanding => {
    const mine = totals(start, [userId]).get(userId) ?? 0;
    if (!canRank) return { points: mine, rank: null, of: null, toNext: null };
    const vals = [...totals(start, memberIds).values()];
    if (vals.every((v) => v === 0)) return { points: mine, rank: null, of: null, toNext: null };
    const higher = vals.filter((v) => v > mine);
    return {
      points: mine,
      rank: higher.length + 1,
      of: memberIds.length,
      toNext: higher.length > 0 ? Math.min(...higher) - mine + 1 : null,
    };
  };

  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  const weekStart = addDaysISO(today, -((dow + 6) % 7));
  const monthStart = `${today.slice(0, 8)}01`;

  const todayP = period(today);
  const weekP = period(weekStart);
  const monthP = period(monthStart);

  let priorBest = 0;
  let priorDays = 0;
  let streak = 0;
  for (let i = 0, d = today; i <= LOOKBACK_DAYS; i++, d = addDaysISO(d, -1)) {
    const pts = cells[d]?.[userId]?.points ?? 0;
    if (d !== today && pts > 0) {
      priorDays++;
      if (pts > priorBest) priorBest = pts;
    }
  }
  for (let i = 0, d = today; i <= LOOKBACK_DAYS; i++, d = addDaysISO(d, -1)) {
    const pts = cells[d]?.[userId]?.points ?? 0;
    if (pts > 0) {
      streak++;
      continue;
    }
    if (d === today) continue;
    if (!cells[d] || Object.keys(cells[d]).length === 0) continue;
    break;
  }

  return {
    poolLabel: pool.label,
    today: todayP,
    week: weekP,
    month: monthP,
    streak,
    badges: {
      topToday: todayP.rank === 1 && todayP.points > 0,
      top3Week:
        weekP.rank !== null && weekP.rank <= 3 && weekP.points > 0 && (weekP.of ?? 0) >= MIN_POOL_FOR_TOP3,
      personalBest:
        todayP.points > 0 && priorDays >= MIN_PRIOR_DAYS_FOR_BEST && todayP.points > priorBest,
    },
    bestDayPoints: Math.max(priorBest, todayP.points),
  };
}
