import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

export type ClientCall = { id: string; rating: number; feedback: string; createdAt: Date };

export type ClientCallRow = {
  subscriptionId: string;
  employeeId: string;
  profileId: string;
  clientName: string;
  profileCode: string;
  phone: string;
  altPhone: string | null;
  contactPerson: string | null;
  planName: string;
  status: string;
  /** Calls by the current assignee only, newest first (max 10). */
  calls: ClientCall[];
};

export type EmployeeRating = {
  employeeId: string;
  avg: number | null;
  reviewed: number;
  total: number;
};

export type MyRatingSummary = {
  avg: number;
  reviewed: number;
  total: number;
  lowRated: { clientName: string; profileCode: string; rating: number; feedback: string; createdAt: Date }[];
};

/** Ongoing = same rule as getOngoingServices: ACTIVE/HOLD, not paused, welcome call not pending. */
async function fetchOngoing(assignedToId?: string): Promise<ClientCallRow[]> {
  const pending = await prisma.welcomeCall.findMany({
    where: { profileId: { not: null }, status: "PENDING" },
    select: { profileId: true },
  });
  const excludeIds = pending.map((w) => w.profileId).filter((id): id is string => !!id);

  const subs = await prisma.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "HOLD"] },
      isPaused: false,
      profile: { assignedToId: assignedToId ?? { not: null } },
      ...(excludeIds.length ? { profileId: { notIn: excludeIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      profileId: true,
      status: true,
      plan: { select: { name: true } },
      profile: {
        select: {
          name: true,
          profileCode: true,
          assignedToId: true,
          phone: true,
          altPhone: true,
          contactPerson: true,
        },
      },
      smeReviews: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, rating: true, feedback: true, createdAt: true, employeeId: true },
      },
    },
  });

  return subs.flatMap((s) => {
    const employeeId = s.profile.assignedToId;
    if (!employeeId) return [];
    const calls = s.smeReviews
      .filter((r) => r.employeeId === employeeId)
      .slice(0, 10)
      .map((r) => ({ id: r.id, rating: r.rating, feedback: r.feedback, createdAt: r.createdAt }));
    return [
      {
        subscriptionId: s.id,
        employeeId,
        profileId: s.profileId,
        clientName: s.profile.name ?? "Client",
        profileCode: s.profile.profileCode,
        phone: s.profile.phone,
        altPhone: s.profile.altPhone,
        contactPerson: s.profile.contactPerson,
        planName: s.plan.name ?? "",
        status: s.status,
        calls,
      },
    ];
  });
}

function summarize(rows: ClientCallRow[]): EmployeeRating[] {
  const by = new Map<string, { sum: number; reviewed: number; total: number }>();
  for (const r of rows) {
    const e = by.get(r.employeeId) ?? { sum: 0, reviewed: 0, total: 0 };
    e.total += 1;
    if (r.calls[0]) {
      e.reviewed += 1;
      e.sum += r.calls[0].rating; // latest call = current rating
    }
    by.set(r.employeeId, e);
  }
  return [...by.entries()].map(([employeeId, e]) => ({
    employeeId,
    avg: e.reviewed ? Math.round((e.sum / e.reviewed) * 10) / 10 : null,
    reviewed: e.reviewed,
    total: e.total,
  }));
}

/** SME view: every ongoing client of every employee (excluding the SME's own clients). */
export async function getSmeClientCallData() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!session.user.isSME) return { rows: [] as ClientCallRow[], ratings: [] as EmployeeRating[] };

  const rows = (await fetchOngoing()).filter((r) => r.employeeId !== session.user.id);
  return { rows, ratings: summarize(rows) };
}

/** Employee view: own overall rating + text of the latest call only where it was 1-2 stars. */
export async function getMyRating(): Promise<MyRatingSummary | null> {
  const session = await auth();
  if (!session?.user) return null;

  const rows = await fetchOngoing(session.user.id);
  const [s] = summarize(rows);
  if (!s || s.avg === null) return null;

  const lowRated = rows
    .filter((r) => r.calls[0] && r.calls[0].rating <= 2)
    .map((r) => ({
      clientName: r.clientName,
      profileCode: r.profileCode,
      rating: r.calls[0].rating,
      feedback: r.calls[0].feedback,
      createdAt: r.calls[0].createdAt,
    }));

  return { avg: s.avg, reviewed: s.reviewed, total: s.total, lowRated };
}
