"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";
import type { PPCriteria } from "@/components/pp-validation/pp-criteria-fields";
import { getPPRequestForEdit as _getPPRequestForEdit } from "@/lib/stats/pp-validation";
import { generateProfileCode } from "@/lib/utils/profile-code";

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
    visaStatusMulti: c.visaStatusMulti,
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
  if (!input.clientGender) throw new Error("Client gender is required");
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
  if (!input.clientGender) throw new Error("Client gender is required");
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


async function requireSME() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (!session.user.isSME) throw new Error("Only SMEs can review PP validation requests");
  return session.user;
}

export type PPApproveInput = {
  requestId: string;
  assignedEmployeeId: string;
  matchesFound?: number;
  matchedProfileCodes?: string[];
  note?: string;
  /** If Maya edited the criteria during review, pass the updated PPCriteria; otherwise the request's stored criteria is used as-is. */
  editedCriteria?: PPCriteria;
};

export async function approvePPValidationAction(input: PPApproveInput) {
  const user = await requireSME();

  const request = await prisma.pPValidationRequest.findUnique({
    where: { id: input.requestId },
  });
  if (!request) throw new Error("Request not found");
  if (request.status === "APPROVED") throw new Error("Request already approved");

  let profileId = request.profileId;

  if (!profileId) {
    if (!request.clientGender) {
      throw new Error("Client gender is required before approval");
    }

    const criteriaForProfile = input.editedCriteria
      ? criteriaData(input.editedCriteria)
      : {
          minAge: request.minAge,
          maxAge: request.maxAge,
          minHeight: request.minHeight,
          maxHeight: request.maxHeight,
          maritalStatusMulti: request.maritalStatusMulti,
          motherTongueIds: request.motherTongueIds,
          religionIds: request.religionIds,
          casteIds: request.casteIds,
          manglikStatusMulti: request.manglikStatusMulti,
          hasChildrenOkMulti: request.hasChildrenOkMulti,
          countryMulti: request.countryMulti,
          stateMulti: request.stateMulti,
          cityMulti: request.cityMulti,
          qualificationMulti: request.qualificationMulti,
          professionMulti: request.professionMulti,
          annualIncomeCurrency: request.annualIncomeCurrency,
          annualIncomeRanges: request.annualIncomeRanges,
          dietMulti: request.dietMulti,
          drinkingMulti: request.drinkingMulti,
          smokingMulti: request.smokingMulti,
          visaStatusMulti: request.visaStatusMulti,
          aboutDesiredPartner: request.aboutDesiredPartner,
        };

    const profileCode = await generateProfileCode(request.clientGender);

    const profile = await prisma.profile.create({
      data: {
        profileCode,
        name: request.clientName,
        gender: request.clientGender,
        phone: request.clientPhone,
        email: request.clientEmail,
        city: request.clientLocation,
        partnerPreference: {
          create: criteriaForProfile,
        },
      },
    });

    profileId = profile.id;
  }

  await prisma.pPValidationRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      profileId,
      assignedEmployeeId: input.assignedEmployeeId,
    },
  });

  await prisma.pPValidationReview.create({
    data: {
      requestId: request.id,
      reviewerId: user.id,
      decision: "APPROVED",
      matchesFound: input.matchesFound ?? null,
      matchedProfileCodes: input.matchedProfileCodes ?? [],
      note: input.note || null,
    },
  });

  revalidateAll();
}

export async function requestPPRevisionAction(requestId: string, note: string) {
  const user = await requireSME();
  if (!note?.trim()) throw new Error("A note is required when requesting revision");

  const request = await prisma.pPValidationRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true },
  });
  if (!request) throw new Error("Request not found");
  if (request.status === "APPROVED") throw new Error("Cannot request revision on an approved request");

  await prisma.pPValidationRequest.update({
    where: { id: request.id },
    data: { status: "NEEDS_REVISION" },
  });

  await prisma.pPValidationReview.create({
    data: {
      requestId: request.id,
      reviewerId: user.id,
      decision: "NEEDS_REVISION",
      note: note.trim(),
    },
  });

  revalidateAll();
}
