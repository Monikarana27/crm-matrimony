import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { startOfTodayIST } from "@/lib/utils/date-boundaries";

export type CreatorRange = "today" | "7d" | "30d" | "month" | "all";

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_MS = 5.5 * 60 * 60 * 1000;
const LIST_LIMIT = 300;

function istDate(d: Date) {
  return new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);
}

function addDaysISO(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type DayCell = { drafts: number; completed: number; edits: number; deleted: number };

export type CreatorSummary = {
  id: string;
  name: string;
  active: boolean;
  drafts: number;
  completed: number;
  edits: number;
  deleted: number;
  activeDays: number;
  avgPerActiveDay: number | null;
  bestDay: string | null;
  bestDayCount: number;
  lastAt: string | null;
};

export type CreatorListRow = {
  ts: string;
  creatorId: string;
  profileId: string;
  code: string;
  name: string;
  deleted: boolean;
};

type DailyRow = {
  uid: string;
  day: string;
  drafts: number;
  completed: number;
  edits: number;
  deleted: number;
  last_at: Date;
};

type ListRaw = {
  ts: Date;
  uid: string;
  id: string;
  code: string;
  name: string;
  deleted_at: Date | null;
};

export async function getProfileCreatorHistory({
  range,
  creatorId,
  day,
}: {
  range: CreatorRange;
  creatorId: string | null;
  day: string | null;
}) {
  const todayStart = startOfTodayIST();
  const nowIst = new Date(Date.now() + IST_MS);
  const monthStart = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), 1) - IST_MS);
  const from =
    range === "today"
      ? todayStart
      : range === "7d"
      ? new Date(todayStart.getTime() - 6 * DAY_MS)
      : range === "30d"
      ? new Date(todayStart.getTime() - 29 * DAY_MS)
      : range === "month"
      ? monthStart
      : new Date("2020-01-01T00:00:00Z");
  const to = new Date(todayStart.getTime() + DAY_MS);
  const generatedAt = new Date().toISOString();

  const creators = await prisma.user.findMany({
    where: { role: "PROFILE_CREATOR" },
    select: { id: true, name: true, active: true },
    orderBy: { name: "asc" },
  });
  if (creators.length === 0) {
    return {
      creators: [],
      summaries: [] as CreatorSummary[],
      days: [] as string[],
      cells: {} as Record<string, Record<string, DayCell>>,
      list: [] as CreatorListRow[],
      listTruncated: false,
      generatedAt,
    };
  }
  const ids = creators.map((c) => c.id);
  const selectedIds = creatorId && ids.includes(creatorId) ? [creatorId] : ids;

  // The profile list can be narrowed to one day (IST) by clicking a row.
  const listFrom = day ? new Date(`${day}T00:00:00+05:30`) : from;
  const listTo = day ? new Date(listFrom.getTime() + DAY_MS) : to;

  const [daily, listRaw] = await Promise.all([
    prisma.$queryRaw<DailyRow[]>(Prisma.sql`
      SELECT a."actorId" AS uid,
        to_char(a."createdAt" + interval '5 hours 30 minutes', 'YYYY-MM-DD') AS day,
        COUNT(*) FILTER (WHERE a.action = 'CREATE_STANDALONE_DRAFT_PROFILE')::int AS drafts,
        COUNT(*) FILTER (WHERE a.action = 'COMPLETE_STANDALONE_PROFILE')::int AS completed,
        COUNT(*) FILTER (WHERE a.action = 'UPDATE_PROFILE')::int AS edits,
        COUNT(*) FILTER (WHERE a.action = 'DELETE_PROFILE')::int AS deleted,
        MAX(a."createdAt") AS last_at
      FROM activity_logs a
      WHERE a."actorId" IN (${Prisma.join(ids)})
        AND a."createdAt" >= ${from} AND a."createdAt" < ${to}
        AND a.action IN ('CREATE_STANDALONE_DRAFT_PROFILE','COMPLETE_STANDALONE_PROFILE','UPDATE_PROFILE','DELETE_PROFILE')
      GROUP BY 1, 2
    `),
    prisma.$queryRaw<ListRaw[]>(Prisma.sql`
      SELECT a."createdAt" AS ts, a."actorId" AS uid, p.id AS id, p."profileCode" AS code,
             p.name AS name, p."deletedAt" AS deleted_at
      FROM activity_logs a
      JOIN profiles p ON p.id = a."entityId"
      WHERE a.action = 'COMPLETE_STANDALONE_PROFILE'
        AND a."actorId" IN (${Prisma.join(selectedIds)})
        AND a."createdAt" >= ${listFrom} AND a."createdAt" < ${listTo}
      ORDER BY a."createdAt" DESC
      LIMIT ${LIST_LIMIT + 1}
    `),
  ]);

  const cells: Record<string, Record<string, DayCell>> = {};
  let minDay: string | null = null;
  for (const r of daily) {
    (cells[r.day] ??= {})[r.uid] = {
      drafts: r.drafts,
      completed: r.completed,
      edits: r.edits,
      deleted: r.deleted,
    };
    if (!minDay || r.day < minDay) minDay = r.day;
  }

  const lastDay = istDate(todayStart);
  const firstDay = range === "all" ? minDay ?? lastDay : istDate(from);
  const days: string[] = [];
  for (let d = lastDay, i = 0; d >= firstDay && i < 400; d = addDaysISO(d, -1), i++) days.push(d);

  const summaries: CreatorSummary[] = creators.map((c) => {
    let drafts = 0, completed = 0, edits = 0, deleted = 0, activeDays = 0, bestDayCount = 0;
    let bestDay: string | null = null;
    let last: Date | null = null;
    for (const r of daily) {
      if (r.uid !== c.id) continue;
      drafts += r.drafts;
      completed += r.completed;
      edits += r.edits;
      deleted += r.deleted;
      if (r.drafts + r.completed + r.edits + r.deleted > 0) activeDays++;
      if (r.completed > bestDayCount) {
        bestDayCount = r.completed;
        bestDay = r.day;
      }
      if (!last || r.last_at > last) last = r.last_at;
    }
    return {
      id: c.id,
      name: c.name,
      active: c.active,
      drafts,
      completed,
      edits,
      deleted,
      activeDays,
      avgPerActiveDay: activeDays > 0 ? completed / activeDays : null,
      bestDay,
      bestDayCount,
      lastAt: last ? last.toISOString() : null,
    };
  });

  const listTruncated = listRaw.length > LIST_LIMIT;
  const list: CreatorListRow[] = listRaw.slice(0, LIST_LIMIT).map((r) => ({
    ts: r.ts.toISOString(),
    creatorId: r.uid,
    profileId: r.id,
    code: r.code,
    name: r.name,
    deleted: r.deleted_at !== null,
  }));

  return { creators, summaries, days, cells, list, listTruncated, generatedAt };
}
