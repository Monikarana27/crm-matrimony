import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import type { PPCriteria } from "@/components/pp-validation/pp-criteria-fields";
import { EMPTY_PP_CRITERIA } from "@/components/pp-validation/pp-criteria-fields";

export type PPActivityItem = {
  id: string;
  by: string;
  at: Date;
  label: string;
  text: string | null;
  followUpDate?: Date | null;
  resolved?: boolean;
};

export type PPRequestSummary = {
  id: string;
  clientName: string;
  clientPhone: string;
  status: "PENDING" | "APPROVED" | "NEEDS_REVISION";
  createdAt: Date;
  updatedAt: Date;
  latestNote: string | null;
  activity?: PPActivityItem[];
};

const SALES_ROLES = ["SALES", "SALES_TL", "SALES_MANAGER", "SERVICE_MANAGER"];

export async function getMyPPRequests(): Promise<PPRequestSummary[]> {
  const session = await auth();
  if (!session?.user) return [];

  const rows = await prisma.pPValidationRequest.findMany({
    where: { submittedById: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          note: true,
          decision: true,
          matchesFound: true,
          createdAt: true,
          reviewer: { select: { name: true } },
        },
      },
      followUps: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          note: true,
          followUpDate: true,
          resolvedAt: true,
          createdAt: true,
          createdBy: { select: { name: true } },
        },
      },
    },
  });

  return rows.map((r) => {
    const reviewItems: PPActivityItem[] = r.reviews
      .filter((v) => v.note || v.decision !== "PENDING" || v.matchesFound !== null)
      .map((v) => ({
        id: `r-${v.id}`,
        by: v.reviewer.name,
        at: v.createdAt,
        label:
          v.decision === "APPROVED"
            ? "approved"
            : v.decision === "NEEDS_REVISION"
            ? "asked for revision"
            : v.matchesFound !== null
            ? `checked matches (${v.matchesFound} found)`
            : "reviewed",
        text: v.note,
      }));
    const followUpItems: PPActivityItem[] = r.followUps.map((f) => ({
      id: `f-${f.id}`,
      by: f.createdBy.name,
      at: f.createdAt,
      label: "follow-up",
      text: f.note.replace(/^PP request follow-up — .*?\): /, ""),
      followUpDate: f.followUpDate,
      resolved: !!f.resolvedAt,
    }));
    const activity = [...reviewItems, ...followUpItems].sort(
      (a, b) => b.at.getTime() - a.at.getTime()
    );
    return {
      id: r.id,
      clientName: r.clientName,
      clientPhone: r.clientPhone,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      latestNote: r.reviews[0]?.note ?? null,
      activity,
    };
  });
}

export async function getPPRequestForEdit(id: string): Promise<{
  clientName: string;
  clientGender: "MALE" | "FEMALE" | "OTHER" | undefined;
  clientPhone: string;
  clientEmail: string;
  clientLocation: string;
  packageDetails: string;
  amount: string;
  paymentMode: string;
  notes: string;
  criteria: PPCriteria;
} | null> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const row = await prisma.pPValidationRequest.findUnique({ where: { id } });
  if (!row) return null;

  const isSales = SALES_ROLES.includes(session.user.role);
  if (isSales && row.submittedById !== session.user.id) throw new Error("Unauthorized");

  return {
    clientName: row.clientName,
    clientGender: row.clientGender ?? undefined,
    clientPhone: row.clientPhone,
    clientEmail: row.clientEmail ?? "",
    clientLocation: row.clientLocation ?? "",
    packageDetails: row.packageDetails ?? "",
    amount: row.amount ?? "",
    paymentMode: row.paymentMode ?? "",
    notes: row.notes ?? "",
    criteria: {
      ...EMPTY_PP_CRITERIA,
      minAge: row.minAge?.toString() ?? "",
      maxAge: row.maxAge?.toString() ?? "",
      minHeight: row.minHeight ?? "",
      maxHeight: row.maxHeight ?? "",
      maritalStatusMulti: row.maritalStatusMulti,
      motherTongueIds: row.motherTongueIds,
      religionIds: row.religionIds,
      casteIds: row.casteIds,
      manglikStatusMulti: row.manglikStatusMulti,
      hasChildrenOkMulti: row.hasChildrenOkMulti,
      countryMulti: row.countryMulti,
      stateMulti: row.stateMulti,
      cityMulti: row.cityMulti,
      qualificationMulti: row.qualificationMulti,
      professionMulti: row.professionMulti,
      annualIncomeCurrency: row.annualIncomeCurrency ?? "",
      annualIncomeRanges: row.annualIncomeRanges,
      dietMulti: row.dietMulti,
      drinkingMulti: row.drinkingMulti,
      smokingMulti: row.smokingMulti,
      visaStatusMulti: row.visaStatusMulti,
      aboutDesiredPartner: row.aboutDesiredPartner ?? "",
    },
  };
}

export type PPQueueRow = {
  id: string;
  clientName: string;
  clientPhone: string;
  clientLocation: string | null;
  packageDetails: string | null;
  createdAt: Date;
  updatedAt: Date;
  submittedByName: string | null;
};

/** SME queue: pending requests awaiting Maya's review, oldest first. */
export async function getPendingPPRequests(): Promise<PPQueueRow[]> {
  const session = await auth();
  if (!session?.user?.isSME) throw new Error("Unauthorized");

  const rows = await prisma.pPValidationRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      clientLocation: true,
      packageDetails: true,
      createdAt: true,
      updatedAt: true,
      submittedBy: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    clientName: r.clientName,
    clientPhone: r.clientPhone,
    clientLocation: r.clientLocation,
    packageDetails: r.packageDetails,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    submittedByName: r.submittedBy?.name ?? null,
  }));
}

/** Lightweight count for nav/tab badges — same scope as getPendingPPRequests but no row fetch. */
export async function getPendingPPValidationCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.isSME) return 0;
  return prisma.pPValidationRequest.count({ where: { status: "PENDING" } });
}

export type PPReviewedRow = {
  id: string;
  clientName: string;
  clientPhone: string;
  packageDetails: string | null;
  submittedByName: string | null;
  decision: "APPROVED" | "NEEDS_REVISION";
  note: string | null;
  matchesFound: number | null;
  reviewedAt: Date;
  currentStatus: "PENDING" | "APPROVED" | "NEEDS_REVISION";
  assignedEmployeeName: string | null;
};

/** SME history: every APPROVED / NEEDS_REVISION decision made by the signed-in SME, newest first. */
export async function getReviewedPPRequests(): Promise<PPReviewedRow[]> {
  const session = await auth();
  if (!session?.user?.isSME) throw new Error("Unauthorized");

  const rows = await prisma.pPValidationReview.findMany({
    where: {
      reviewerId: session.user.id,
      decision: { in: ["APPROVED", "NEEDS_REVISION"] },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      decision: true,
      note: true,
      matchesFound: true,
      createdAt: true,
      request: {
        select: {
          clientName: true,
          clientPhone: true,
          packageDetails: true,
          status: true,
          submittedBy: { select: { name: true } },
          assignedEmployee: { select: { name: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    clientName: r.request.clientName,
    clientPhone: r.request.clientPhone,
    packageDetails: r.request.packageDetails,
    submittedByName: r.request.submittedBy?.name ?? null,
    decision: r.decision as "APPROVED" | "NEEDS_REVISION",
    note: r.note,
    matchesFound: r.matchesFound,
    reviewedAt: r.createdAt,
    currentStatus: r.request.status,
    assignedEmployeeName: r.request.assignedEmployee?.name ?? null,
  }));
}

export type PPAdminRow = {
  id: string;
  clientName: string;
  clientPhone: string;
  status: "PENDING" | "APPROVED" | "NEEDS_REVISION";
  createdAt: Date;
  updatedAt: Date;
  submittedByName: string;
  assignedEmployeeName: string | null;
};

/** Admin/Super Admin report: every PP request across all Sales employees. */
export async function getAllPPRequests(): Promise<PPAdminRow[]> {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) return [];

  const rows = await prisma.pPValidationRequest.findMany({
    orderBy: { updatedAt: "desc" },
    take: 500,
    select: {
      id: true,
      clientName: true,
      clientPhone: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      submittedBy: { select: { name: true } },
      assignedEmployee: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    clientName: r.clientName,
    clientPhone: r.clientPhone,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    submittedByName: r.submittedBy.name ?? "Unknown",
    assignedEmployeeName: r.assignedEmployee?.name ?? null,
  }));
}
