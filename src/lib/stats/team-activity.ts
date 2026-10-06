import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { startOfTodayIST } from "@/lib/utils/date-boundaries";

export type RangeKey = "today" | "7d" | "30d";
export type TeamKey = "all" | "sales" | "service" | "profile";

/** Points per activity. Change the numbers here and the page and ranking follow. */
export const WEIGHTS = {
  leadRemark: 1,
  leadUpdate: 1,
  converted: 10, // bonus on top of the remark that marked it converted
  profileDone: 5,
  profileEdit: 1,
  sent: 2,
  note: 1,
  call: 2,
  followup: 2,
  payment: 15,
} as const;

export type CountKey =
  | "leadTouches"
  | "converted"
  | "profilesDone"
  | "profileEdits"
  | "sent"
  | "notes"
  | "calls"
  | "followups"
  | "payments";

export type TeamActivityRow = {
  id: string;
  name: string;
  role: string;
  isSME: boolean;
  leadTouches: number;
  converted: number;
  profilesDone: number;
  profileEdits: number;
  sent: number;
  notes: number;
  calls: number;
  followups: number;
  payments: number;
  score: number;
  hours: number;
  perHour: number | null;
  lastAt: string | null;
  state: "working" | "break" | "offline";
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Unused accounts that no real person logs in with.
const EXCLUDED_USER_IDS = ["cmtikr0sp0001l39ig0j04f11", "cmto3zkni0009l3kx0tl5oh9j"];

const SALES_ROLES: Role[] = ["SALES", "SALES_TL", "SALES_MANAGER"];
const SERVICE_ROLES: Role[] = ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "SME"];
const PROFILE_ROLES: Role[] = ["PROFILE_CREATOR"];
const TEAM_ROLES: Record<TeamKey, Role[]> = {
  all: [...SALES_ROLES, ...SERVICE_ROLES, ...PROFILE_ROLES],
  sales: SALES_ROLES,
  service: SERVICE_ROLES,
  profile: PROFILE_ROLES,
};

type RawAgg = {
  uid: string;
  lead_remarks: number;
  lead_updates: number;
  converted: number;
  profile_done: number;
  profile_edits: number;
  sent: number;
  profile_notes: number;
  service_notes: number;
  calls: number;
  followups: number;
  payments: number;
  last_at: Date | null;
};

type RawAtt = {
  uid: string;
  hours: number | null;
  clocked_in: boolean | null;
  on_break: boolean | null;
};

export async function getTeamActivity({ range, team }: { range: RangeKey; team: TeamKey }) {
  const todayStart = startOfTodayIST();
  const from =
    range === "today"
      ? todayStart
      : new Date(todayStart.getTime() - (range === "7d" ? 6 : 29) * DAY_MS);
  const to = new Date(todayStart.getTime() + DAY_MS);

  const [users, agg, att] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, role: { in: TEAM_ROLES[team] }, id: { notIn: EXCLUDED_USER_IDS } },
      select: { id: true, name: true, role: true, isSME: true },
    }),
    prisma.$queryRaw<RawAgg[]>(Prisma.sql`
      WITH ev AS (
        SELECT "actorId" AS uid, "createdAt" AS ts,
          CASE
            WHEN action IN ('UPDATE_LEAD_STATUS','UPDATE_LEAD') THEN 'lead_update'
            WHEN action = 'COMPLETE_STANDALONE_PROFILE' THEN 'profile_done'
            WHEN action = 'UPDATE_PROFILE' THEN 'profile_edit'
            ELSE 'sent'
          END AS kind
        FROM activity_logs
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
          AND action IN ('UPDATE_LEAD_STATUS','UPDATE_LEAD','COMPLETE_STANDALONE_PROFILE',
                         'UPDATE_PROFILE','SEND_SEARCHED_PROFILES','SEND_MATCHED_PROFILES')
        UNION ALL
        SELECT "actorId", "createdAt", 'lead_remark' FROM lead_remarks
          WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        UNION ALL
        SELECT "actorId", "createdAt", 'converted' FROM lead_remarks
          WHERE status::text = 'CONVERTED' AND "createdAt" >= ${from} AND "createdAt" < ${to}
        UNION ALL
        SELECT "actorId", "createdAt", 'profile_note' FROM profile_remarks
          WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        UNION ALL
        SELECT "actorId", "createdAt", 'service_note' FROM subscription_comments
          WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        UNION ALL
        SELECT "createdById", "createdAt", 'call' FROM call_logs
          WHERE "createdById" IS NOT NULL AND "createdAt" >= ${from} AND "createdAt" < ${to}
        UNION ALL
        SELECT "createdById", "createdAt", 'call' FROM welcome_call_logs
          WHERE "createdById" IS NOT NULL AND "createdAt" >= ${from} AND "createdAt" < ${to}
        UNION ALL
        SELECT "resolvedById", "resolvedAt", 'followup' FROM sme_follow_ups
          WHERE "resolvedById" IS NOT NULL AND "resolvedAt" >= ${from} AND "resolvedAt" < ${to}
        UNION ALL
        SELECT "soldById", "paidAt", 'payment' FROM payments
          WHERE status::text = 'PAID' AND "soldById" IS NOT NULL
            AND "paidAt" >= ${from} AND "paidAt" < ${to}
      )
      SELECT uid,
        COUNT(*) FILTER (WHERE kind = 'lead_remark')::int AS lead_remarks,
        COUNT(*) FILTER (WHERE kind = 'lead_update')::int AS lead_updates,
        COUNT(*) FILTER (WHERE kind = 'converted')::int AS converted,
        COUNT(*) FILTER (WHERE kind = 'profile_done')::int AS profile_done,
        COUNT(*) FILTER (WHERE kind = 'profile_edit')::int AS profile_edits,
        COUNT(*) FILTER (WHERE kind = 'sent')::int AS sent,
        COUNT(*) FILTER (WHERE kind = 'profile_note')::int AS profile_notes,
        COUNT(*) FILTER (WHERE kind = 'service_note')::int AS service_notes,
        COUNT(*) FILTER (WHERE kind = 'call')::int AS calls,
        COUNT(*) FILTER (WHERE kind = 'followup')::int AS followups,
        COUNT(*) FILTER (WHERE kind = 'payment')::int AS payments,
        MAX(ts) AS last_at
      FROM ev
      WHERE uid IS NOT NULL
      GROUP BY uid
    `),
    prisma.$queryRaw<RawAtt[]>(Prisma.sql`
      SELECT "userId" AS uid,
        (SUM(GREATEST(0, LEAST(50400,
          EXTRACT(EPOCH FROM (
            COALESCE("checkOut", CASE WHEN "checkIn" >= ${todayStart} THEN (NOW() AT TIME ZONE 'UTC') ELSE "checkIn" END)
            - "checkIn"))
          - CASE WHEN "breakStart" IS NOT NULL THEN
              EXTRACT(EPOCH FROM (
                COALESCE("breakEnd",
                  CASE WHEN "checkOut" IS NULL AND "checkIn" >= ${todayStart}
                       THEN (NOW() AT TIME ZONE 'UTC') ELSE "breakStart" END)
                - "breakStart"))
            ELSE 0 END
        ))) / 3600.0)::float8 AS hours,
        BOOL_OR("checkOut" IS NULL AND "checkIn" >= ${todayStart}) AS clocked_in,
        BOOL_OR("checkOut" IS NULL AND "checkIn" >= ${todayStart}
                AND "breakStart" IS NOT NULL AND "breakEnd" IS NULL) AS on_break
      FROM attendance
      WHERE "checkIn" IS NOT NULL AND "checkIn" >= ${from} AND "checkIn" < ${to}
      GROUP BY "userId"
    `),
  ]);

  const aggById = new Map(agg.map((a) => [a.uid, a]));
  const attById = new Map(att.map((a) => [a.uid, a]));

  const rows: TeamActivityRow[] = users.map((u) => {
    const a = aggById.get(u.id);
    const t = attById.get(u.id);
    const leadRemarks = a?.lead_remarks ?? 0;
    const leadUpdates = a?.lead_updates ?? 0;
    const converted = a?.converted ?? 0;
    const profilesDone = a?.profile_done ?? 0;
    const profileEdits = a?.profile_edits ?? 0;
    const sent = a?.sent ?? 0;
    const notes = (a?.profile_notes ?? 0) + (a?.service_notes ?? 0);
    const calls = a?.calls ?? 0;
    const followups = a?.followups ?? 0;
    const payments = a?.payments ?? 0;

    const score =
      leadRemarks * WEIGHTS.leadRemark +
      leadUpdates * WEIGHTS.leadUpdate +
      converted * WEIGHTS.converted +
      profilesDone * WEIGHTS.profileDone +
      profileEdits * WEIGHTS.profileEdit +
      sent * WEIGHTS.sent +
      notes * WEIGHTS.note +
      calls * WEIGHTS.call +
      followups * WEIGHTS.followup +
      payments * WEIGHTS.payment;

    const hours = t?.hours ?? 0;

    return {
      id: u.id,
      name: u.name,
      role: u.role,
      isSME: u.isSME,
      leadTouches: leadRemarks + leadUpdates,
      converted,
      profilesDone,
      profileEdits,
      sent,
      notes,
      calls,
      followups,
      payments,
      score,
      hours,
      perHour: hours >= 0.5 ? score / hours : null,
      lastAt: a?.last_at ? a.last_at.toISOString() : null,
      state: t?.on_break ? "break" : t?.clocked_in ? "working" : "offline",
    };
  });

  rows.sort((x, y) => y.score - x.score || x.name.localeCompare(y.name));

  return { rows, generatedAt: new Date().toISOString() };
}
