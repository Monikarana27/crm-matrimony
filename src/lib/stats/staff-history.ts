import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { WEIGHTS } from "@/lib/stats/team-activity";

export type StaffTeam = "sales" | "service" | "profile";

export type CountKey =
  | "leads"
  | "converted"
  | "payments"
  | "profileEdits"
  | "profilesDone"
  | "sent"
  | "notes"
  | "calls"
  | "followups"
  | "drafts"
  | "deleted";

type Kind =
  | "lead_remark"
  | "converted"
  | "lead_action"
  | "profile_edit"
  | "profile_done"
  | "sent"
  | "note"
  | "call"
  | "followup"
  | "payment"
  | "draft"
  | "deleted";

const IST_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const TIMELINE_LIMIT = 500;

// Unused accounts that no real person logs in with.
const EXCLUDED_USER_IDS = ["cmtikr0sp0001l39ig0j04f11", "cmto3zkni0009l3kx0tl5oh9j"];

const TEAM_ROLES: Record<StaffTeam, Role[]> = {
  sales: ["SALES", "SALES_TL", "SALES_MANAGER"],
  service: ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "SME"],
  profile: ["PROFILE_CREATOR"],
};

const POINTS: Record<Kind, number> = {
  lead_remark: WEIGHTS.leadRemark,
  converted: WEIGHTS.converted,
  lead_action: WEIGHTS.leadUpdate,
  profile_edit: WEIGHTS.profileEdit,
  profile_done: WEIGHTS.profileDone,
  sent: WEIGHTS.sent,
  note: WEIGHTS.note,
  call: WEIGHTS.call,
  followup: WEIGHTS.followup,
  payment: WEIGHTS.payment,
  draft: 0, // counted but earns no points: the completed profile is what scores
  deleted: 0,
};

const COUNT_KEY: Record<Kind, CountKey> = {
  lead_remark: "leads",
  lead_action: "leads",
  converted: "converted",
  payment: "payments",
  profile_edit: "profileEdits",
  profile_done: "profilesDone",
  sent: "sent",
  note: "notes",
  call: "calls",
  followup: "followups",
  draft: "drafts",
  deleted: "deleted",
};

export const KIND_LABEL: Record<string, string> = {
  lead_remark: "Lead remark",
  lead_action: "Lead update",
  converted: "Converted",
  profile_edit: "Profile edit",
  profile_done: "Profile completed",
  sent: "Profiles sent / notified",
  note: "Note",
  call: "Welcome call",
  followup: "Follow-up done",
  payment: "Sale",
  draft: "Draft started",
  deleted: "Profile deleted",
};

// Activity-log actions. LEAD_QUICK_UPDATE_* are left out on purpose: each one is
// always written together with a lead remark, which is counted instead.
const LEAD_ACTIONS = [
  "UPDATE_LEAD_STATUS",
  "UPDATE_LEAD",
  "LEAD_CALL_FOLLOW_UP",
  "LEAD_CALL_DNP",
  "LEAD_CALL_NOT_INTERESTED",
  "LEAD_CALL_INTERESTED",
];
const PROFILE_EDIT_ACTIONS = ["UPDATE_PROFILE"];
const PROFILE_DONE_ACTIONS = ["COMPLETE_STANDALONE_PROFILE"];
const SENT_ACTIONS = ["SEND_SEARCHED_PROFILES", "SEND_MATCHED_PROFILES", "NOTIFY_PROSPECT"];
const PROFILE_DRAFT_ACTIONS = ["CREATE_STANDALONE_DRAFT_PROFILE"];
const PROFILE_DELETE_ACTIONS = ["DELETE_PROFILE"];
const ALL_ACTIONS = [
  ...LEAD_ACTIONS,
  ...PROFILE_EDIT_ACTIONS,
  ...PROFILE_DONE_ACTIONS,
  ...SENT_ACTIONS,
  ...PROFILE_DRAFT_ACTIONS,
  ...PROFILE_DELETE_ACTIONS,
];

const kindCase = Prisma.sql`CASE
  WHEN a.action IN (${Prisma.join(LEAD_ACTIONS)}) THEN 'lead_action'
  WHEN a.action IN (${Prisma.join(PROFILE_EDIT_ACTIONS)}) THEN 'profile_edit'
  WHEN a.action IN (${Prisma.join(PROFILE_DONE_ACTIONS)}) THEN 'profile_done'
  WHEN a.action IN (${Prisma.join(PROFILE_DRAFT_ACTIONS)}) THEN 'draft'
  WHEN a.action IN (${Prisma.join(PROFILE_DELETE_ACTIONS)}) THEN 'deleted'
  ELSE 'sent' END`;

// A lead action that has a lead remark by the same person within 5 seconds is the
// same piece of work, so it is skipped to avoid counting it twice.
const notDuplicate = Prisma.sql`NOT (
  a.action IN (${Prisma.join(LEAD_ACTIONS)})
  AND EXISTS (
    SELECT 1 FROM lead_remarks dr
    WHERE dr."actorId" = a."actorId"
      AND dr."createdAt" BETWEEN a."createdAt" - interval '5 seconds' AND a."createdAt" + interval '5 seconds'
  )
)`;

export function istToday() {
  return new Date(Date.now() + IST_MS).toISOString().slice(0, 10);
}
export function addDaysISO(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}
function istStart(iso: string) {
  return new Date(`${iso}T00:00:00+05:30`);
}

function emptyCounts(): Record<CountKey, number> {
  return {
    leads: 0,
    converted: 0,
    payments: 0,
    profileEdits: 0,
    profilesDone: 0,
    sent: 0,
    notes: 0,
    calls: 0,
    followups: 0,
    drafts: 0,
    deleted: 0,
  };
}

export type StaffSummary = {
  id: string;
  name: string;
  role: string;
  isSME: boolean;
  active: boolean;
  points: number;
  counts: Record<CountKey, number>;
  activeDays: number;
  avgPerDay: number | null;
  bestDay: string | null;
  bestPoints: number;
  lastAt: string | null;
};

export type DayCell = { points: number; actions: number };

export type TimelineRow = {
  ts: string;
  uid: string;
  kind: string;
  title: string;
  detail: string;
  profileId: string | null;
};

async function loadStaff(team: StaffTeam) {
  return prisma.user.findMany({
    where: { role: { in: TEAM_ROLES[team] }, id: { notIn: EXCLUDED_USER_IDS } },
    select: { id: true, name: true, role: true, isSME: true, active: true },
  });
}

type DailyRaw = { uid: string; day: string; kind: string; n: number; last_at: Date };

export async function getStaffHistory({ team, from, to }: { team: StaffTeam; from: string; to: string }) {
  const staff = await loadStaff(team);
  const generatedAt = new Date().toISOString();
  const days: string[] = [];
  for (let d = to, i = 0; d >= from && i < 400; d = addDaysISO(d, -1), i++) days.push(d);
  if (staff.length === 0) {
    return { summaries: [] as StaffSummary[], days, cells: {} as Record<string, Record<string, DayCell>>, generatedAt };
  }

  const ids = Prisma.join(staff.map((u) => u.id));
  const fromD = istStart(from);
  const toD = new Date(istStart(to).getTime() + DAY_MS);

  const rows = await prisma.$queryRaw<DailyRaw[]>(Prisma.sql`
    WITH ev AS (
      SELECT r."actorId" AS uid, r."createdAt" AS ts, 'lead_remark' AS kind
        FROM lead_remarks r
        WHERE r."actorId" IN (${ids}) AND r."createdAt" >= ${fromD} AND r."createdAt" < ${toD}
      UNION ALL
      SELECT r."actorId", r."createdAt", 'converted'
        FROM lead_remarks r
        WHERE r.status::text = 'CONVERTED'
          AND r."actorId" IN (${ids}) AND r."createdAt" >= ${fromD} AND r."createdAt" < ${toD}
      UNION ALL
      SELECT a."actorId", a."createdAt", ${kindCase}
        FROM activity_logs a
        WHERE a."actorId" IN (${ids}) AND a."createdAt" >= ${fromD} AND a."createdAt" < ${toD}
          AND a.action IN (${Prisma.join(ALL_ACTIONS)})
          AND ${notDuplicate}
      UNION ALL
      SELECT x."actorId", x."createdAt", 'note'
        FROM profile_remarks x
        WHERE x."actorId" IN (${ids}) AND x."createdAt" >= ${fromD} AND x."createdAt" < ${toD}
      UNION ALL
      SELECT x."actorId", x."createdAt", 'note'
        FROM subscription_comments x
        WHERE x."actorId" IN (${ids}) AND x."createdAt" >= ${fromD} AND x."createdAt" < ${toD}
      UNION ALL
      SELECT x."createdById", x."createdAt", 'call'
        FROM welcome_call_logs x
        WHERE x."createdById" IN (${ids}) AND x."createdAt" >= ${fromD} AND x."createdAt" < ${toD}
      UNION ALL
      SELECT x."resolvedById", x."resolvedAt", 'followup'
        FROM sme_follow_ups x
        WHERE x."resolvedById" IN (${ids}) AND x."resolvedAt" >= ${fromD} AND x."resolvedAt" < ${toD}
      UNION ALL
      SELECT x."soldById", x."paidAt", 'payment'
        FROM payments x
        WHERE x.status::text = 'PAID' AND x."soldById" IN (${ids})
          AND x."paidAt" >= ${fromD} AND x."paidAt" < ${toD}
    )
    SELECT uid,
      to_char(ts + interval '5 hours 30 minutes', 'YYYY-MM-DD') AS day,
      kind, COUNT(*)::int AS n, MAX(ts) AS last_at
    FROM ev
    GROUP BY 1, 2, 3
  `);

  const acc = new Map<
    string,
    { counts: Record<CountKey, number>; points: number; byDay: Map<string, number>; last: Date | null }
  >();
  const cells: Record<string, Record<string, DayCell>> = {};

  for (const r of rows) {
    const kind = r.kind as Kind;
    const key = COUNT_KEY[kind];
    if (!key) continue;
    const pts = POINTS[kind] * r.n;
    let a = acc.get(r.uid);
    if (!a) {
      a = { counts: emptyCounts(), points: 0, byDay: new Map(), last: null };
      acc.set(r.uid, a);
    }
    a.counts[key] += r.n;
    if (!a.last || r.last_at > a.last) a.last = r.last_at;
    if (pts === 0) continue; // counted, but earns no points (drafts, deletions)
    a.points += pts;
    a.byDay.set(r.day, (a.byDay.get(r.day) ?? 0) + pts);
    const cell = ((cells[r.day] ??= {})[r.uid] ??= { points: 0, actions: 0 });
    cell.points += pts;
    cell.actions += r.n;
  }

  const summaries: StaffSummary[] = [];
  for (const u of staff) {
    const a = acc.get(u.id);
    if (!a && !u.active) continue; // inactive and did nothing in this range
    let bestDay: string | null = null;
    let bestPoints = 0;
    if (a) {
      for (const [d, p] of a.byDay) {
        if (p > bestPoints) {
          bestPoints = p;
          bestDay = d;
        }
      }
    }
    const activeDays = a ? a.byDay.size : 0;
    summaries.push({
      id: u.id,
      name: u.name,
      role: u.role,
      isSME: u.isSME,
      active: u.active,
      points: a?.points ?? 0,
      counts: a?.counts ?? emptyCounts(),
      activeDays,
      avgPerDay: activeDays > 0 && a ? a.points / activeDays : null,
      bestDay,
      bestPoints,
      lastAt: a?.last ? a.last.toISOString() : null,
    });
  }
  summaries.sort((x, y) => y.points - x.points || x.name.localeCompare(y.name));

  return { summaries, days, cells, generatedAt };
}

type TimelineRaw = {
  ts: Date;
  uid: string;
  kind: string;
  title: string | null;
  detail: string | null;
  profile_id: string | null;
};

export async function getStaffTimeline({
  team,
  from,
  to,
  employeeId,
  day,
}: {
  team: StaffTeam;
  from: string;
  to: string;
  employeeId: string | null;
  day: string | null;
}) {
  const staff = await loadStaff(team);
  const teamIds = staff.map((u) => u.id);
  const validEmployee = employeeId && teamIds.includes(employeeId) ? employeeId : null;
  if (teamIds.length === 0) return { rows: [] as TimelineRow[], truncated: false, employeeId: validEmployee };

  const ids = Prisma.join(validEmployee ? [validEmployee] : teamIds);
  const winFrom = istStart(day ?? from);
  const winTo = new Date(istStart(day ?? to).getTime() + DAY_MS);

  const raw = await prisma.$queryRaw<TimelineRaw[]>(Prisma.sql`
    SELECT * FROM (
      SELECT r."createdAt" AS ts, r."actorId" AS uid, 'lead_remark' AS kind,
             COALESCE(l.name, 'Lead') AS title,
             concat_ws(' · ', r.outcome::text,
               CASE WHEN r.status IS NOT NULL THEN '→ ' || r.status::text END,
               nullif(left(coalesce(r.remark, ''), 160), '')) AS detail,
             NULL::text AS profile_id
        FROM lead_remarks r
        LEFT JOIN leads l ON l.id = r."leadId"
        WHERE r."actorId" IN (${ids}) AND r."createdAt" >= ${winFrom} AND r."createdAt" < ${winTo}
      UNION ALL
      SELECT a."createdAt", a."actorId", ${kindCase},
             CASE WHEN a.action IN (${Prisma.join(LEAD_ACTIONS)}) THEN COALESCE(l.name, 'Lead')
                  ELSE COALESCE(NULLIF(concat_ws(' · ', p."profileCode", p.name), ''), l.name, '-') END,
             initcap(lower(replace(a.action, '_', ' '))),
             p.id
        FROM activity_logs a
        LEFT JOIN leads l ON l.id = a."entityId"
        LEFT JOIN profiles p ON p.id = a."entityId"
        WHERE a."actorId" IN (${ids}) AND a."createdAt" >= ${winFrom} AND a."createdAt" < ${winTo}
          AND a.action IN (${Prisma.join(ALL_ACTIONS)})
          AND ${notDuplicate}
      UNION ALL
      SELECT x."createdAt", x."actorId", 'note',
             COALESCE(NULLIF(concat_ws(' · ', p."profileCode", p.name), ''), 'Profile'),
             nullif(left(x.remark, 160), ''), p.id
        FROM profile_remarks x
        LEFT JOIN profiles p ON p.id = x."profileId"
        WHERE x."actorId" IN (${ids}) AND x."createdAt" >= ${winFrom} AND x."createdAt" < ${winTo}
      UNION ALL
      SELECT x."createdAt", x."actorId", 'note',
             COALESCE(NULLIF(concat_ws(' · ', p."profileCode", p.name), ''), 'Service comment'),
             nullif(left(x.remark, 160), ''), p.id
        FROM subscription_comments x
        LEFT JOIN subscriptions s ON s.id = x."subscriptionId"
        LEFT JOIN profiles p ON p.id = s."profileId"
        WHERE x."actorId" IN (${ids}) AND x."createdAt" >= ${winFrom} AND x."createdAt" < ${winTo}
      UNION ALL
      SELECT x."createdAt", x."createdById", 'call',
             COALESCE(p.name, l.name, 'Welcome call'),
             concat_ws(' · ', x.status::text, nullif(left(coalesce(x.note, ''), 160), '')),
             p.id
        FROM welcome_call_logs x
        LEFT JOIN welcome_calls wc ON wc.id = x."welcomeCallId"
        LEFT JOIN leads l ON l.id = wc."leadId"
        LEFT JOIN profiles p ON p.id = wc."profileId"
        WHERE x."createdById" IN (${ids}) AND x."createdAt" >= ${winFrom} AND x."createdAt" < ${winTo}
      UNION ALL
      SELECT x."resolvedAt", x."resolvedById", 'followup', 'Follow-up done',
             nullif(left(x.note, 160), ''), x."clientProfileId"
        FROM sme_follow_ups x
        WHERE x."resolvedById" IN (${ids}) AND x."resolvedAt" >= ${winFrom} AND x."resolvedAt" < ${winTo}
      UNION ALL
      SELECT x."paidAt", x."soldById", 'payment',
             COALESCE(p.name, 'Client'),
             concat_ws(' ', x.currency, x.amount::text, 'paid'), p.id
        FROM payments x
        LEFT JOIN subscriptions s ON s.id = x."subscriptionId"
        LEFT JOIN profiles p ON p.id = s."profileId"
        WHERE x.status::text = 'PAID' AND x."soldById" IN (${ids})
          AND x."paidAt" >= ${winFrom} AND x."paidAt" < ${winTo}
    ) t
    ORDER BY ts DESC
    LIMIT ${TIMELINE_LIMIT + 1}
  `);

  const truncated = raw.length > TIMELINE_LIMIT;
  const rows: TimelineRow[] = raw.slice(0, TIMELINE_LIMIT).map((r) => ({
    ts: r.ts.toISOString(),
    uid: r.uid,
    kind: r.kind,
    title: r.title ?? "",
    detail: r.detail ?? "",
    profileId: r.profile_id,
  }));
  return { rows, truncated, employeeId: validEmployee };
}
