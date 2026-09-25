"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";
import type { PPCriteria } from "@/components/pp-validation/pp-criteria-fields";
import { getPPRequestForEdit as _getPPRequestForEdit } from "@/lib/stats/pp-validation";

const SALES_ROLES = ["SALES", "SALES_TL", "SALES_MANAGER", "SERVICE_MANAGER"];

async function requireSales() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!SALES_ROLES.includes(session.user.role)) {
    throw new Error("Only Sales can submit PP validation requests");
  }
  return session.user;
}

export async function loadPPRequestForEditAction(id: string) {
  return _getPPRequestForEdit(id);
}

export type PPSubmitInput = {
  clientName: string;
  clientGender?: "MALE" | "FEMALE" | "OTHER";
  clientPhone: string;
  clientEmail?: string;
  clientLocation?: string;
  packageDetails?: string;
  amount?: string;
  paymentMode?: string;
  notes?: string;
  criteria: PPCriteria;
};

function toIntOrNull(v?: string) {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function criteriaData(c: PPCriteria) {
  return {
    minAge: toIntOrNull(c.minAge),
    maxAge: toIntOrNull(c.maxAge),
    minHeight: c.minHeight || null,
    maxHeight: c.maxHeight || null,
    maritalStatusMulti: c.maritalStatusMulti,
    motherTongueIds: c.motherTongueIds,
    religionIds: c.religionIds,
    casteIds: c.casteIds,
    manglikStatusMulti: c.manglikStatusMulti,
    hasChildrenOkMulti: c.hasChildrenOkMulti,
    countryMulti: c.countryMulti,
    stateMulti: c.stateMulti,
    cityMulti: c.cityMulti,
    qualificationMulti: c.qualificationMulti,
    professionMulti: c.professionMulti,
    annualIncomeCurrency: c.annualIncomeCurrency || null,
    annualIncomeRanges: c.annualIncomeRanges,
    dietMulti: c.dietMulti,
    drinkingMulti: c.drinkingMulti,
    smokingMulti: c.smokingMulti,
    aboutDesiredPartner: c.aboutDesiredPartner || null,
  };
}

function revalidateAll() {
  revalidatePath("/dashboard/sales/pp-validation");
  revalidatePath("/dashboard/service");
  revalidatePath("/dashboard/sme");
  revalidatePath("/dashboard/admin/pp-validation");
}

export async function submitPPValidationAction(input: PPSubmitInput) {
  const user = await requireSales();
  if (!input.clientName?.trim()) throw new Error("Client name is required");
  if (!input.clientPhone?.trim()) throw new Error("Client phone is required");

  await prisma.pPValidationRequest.create({
    data: {
      clientName: input.clientName.trim(),
      clientGender: input.clientGender || null,
      clientPhone: input.clientPhone.trim(),
      clientEmail: input.clientEmail || null,
      clientLocation: input.clientLocation || null,
      packageDetails: input.packageDetails || null,
      amount: input.amount || null,
      paymentMode: input.paymentMode || null,
      notes: input.notes || null,
      submittedById: user.id,
      status: "PENDING",
      ...criteriaData(input.criteria),
    },
  });

  revalidateAll();
}

export async function resubmitPPValidationAction(id: string, input: PPSubmitInput) {
  const user = await requireSales();
  const existing = await prisma.pPValidationRequest.findFirst({
    where: { id, submittedById: user.id },
    select: { id: true, status: true },
  });
  if (!existing) throw new Error("Request not found");
  if (existing.status !== "NEEDS_REVISION") {
    throw new Error("Only requests needing revision can be resubmitted");
  }
  if (!input.clientName?.trim()) throw new Error("Client name is required");
  if (!input.clientPhone?.trim()) throw new Error("Client phone is required");

  await prisma.pPValidationRequest.update({
    where: { id: existing.id },
    data: {
      clientName: input.clientName.trim(),
      clientGender: input.clientGender || null,
      clientPhone: input.clientPhone.trim(),
      clientEmail: input.clientEmail || null,
      clientLocation: input.clientLocation || null,
      packageDetails: input.packageDetails || null,
      amount: input.amount || null,
      paymentMode: input.paymentMode || null,
      notes: input.notes || null,
      status: "PENDING",
      ...criteriaData(input.criteria),
    },
  });

  revalidateAll();
}
