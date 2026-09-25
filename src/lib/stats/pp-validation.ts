import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import type { PPCriteria } from "@/components/pp-validation/pp-criteria-fields";
import { EMPTY_PP_CRITERIA } from "@/components/pp-validation/pp-criteria-fields";

export type PPRequestSummary = {
  id: string;
  clientName: string;
  clientPhone: string;
  status: "PENDING" | "APPROVED" | "NEEDS_REVISION";
  createdAt: Date;
  updatedAt: Date;
  latestNote: string | null;
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
      reviews: { orderBy: { createdAt: "desc" }, take: 1, select: { note: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    clientName: r.clientName,
    clientPhone: r.clientPhone,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    latestNote: r.reviews[0]?.note ?? null,
  }));
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
      aboutDesiredPartner: row.aboutDesiredPartner ?? "",
    },
  };
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
