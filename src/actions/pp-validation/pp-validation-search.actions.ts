"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { getHeightLabelsInCmRange } from "@/lib/constants/profile-options";

async function requireStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export type PPValidationSearchFilters = {
  minAge?: string;
  maxAge?: string;
  minHeight?: string;
  maxHeight?: string;
  maritalStatusMulti?: string[];
  motherTongueIds?: string[];
  religionIds?: string[];
  casteIds?: string[];
  manglikStatusMulti?: string[];
  countryMulti?: string[];
  stateMulti?: string[];
  cityMulti?: string[];
  qualificationMulti?: string[];
  professionMulti?: string[];
  annualIncomeCurrency?: string;
  annualIncomeRanges?: string[];
  dietMulti?: string[];
  drinkingMulti?: string[];
  smokingMulti?: string[];
  visaStatusMulti?: string[];
};

export async function searchProfilesForPPValidationAction(
  filters: PPValidationSearchFilters,
  page: number = 1,
  pageSize: number = 20
) {
  await requireStaff();

  const now = new Date();
  const dobFilter: { lte?: Date; gte?: Date } = {};
  const minAge = filters.minAge ? Number(filters.minAge) : undefined;
  const maxAge = filters.maxAge ? Number(filters.maxAge) : undefined;
  if (minAge) {
    dobFilter.lte = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
  }
  if (maxAge) {
    dobFilter.gte = new Date(now.getFullYear() - maxAge - 1, now.getMonth(), now.getDate());
  }

  const minHeightCm = filters.minHeight ? Number(filters.minHeight) : undefined;
  const maxHeightCm = filters.maxHeight ? Number(filters.maxHeight) : undefined;

  const where = {
    deletedAt: null,
    ...(filters.maritalStatusMulti?.length ? { maritalStatus: { in: filters.maritalStatusMulti } } : {}),
    ...(filters.motherTongueIds?.length ? { motherTongueId: { in: filters.motherTongueIds } } : {}),
    ...(filters.religionIds?.length ? { religionId: { in: filters.religionIds } } : {}),
    ...(filters.casteIds?.length ? { casteId: { in: filters.casteIds } } : {}),
    ...(filters.manglikStatusMulti?.length ? { manglik: { in: filters.manglikStatusMulti } } : {}),
    ...(filters.countryMulti?.length ? { country: { in: filters.countryMulti } } : {}),
    ...(filters.stateMulti?.length ? { state: { in: filters.stateMulti } } : {}),
    ...(filters.cityMulti?.length ? { city: { in: filters.cityMulti, mode: "insensitive" as const } } : {}),
    ...(filters.qualificationMulti?.length ? { highestQualification: { in: filters.qualificationMulti } } : {}),
    ...(filters.professionMulti?.length ? { profession: { in: filters.professionMulti } } : {}),
    ...(filters.dietMulti?.length ? { diet: { in: filters.dietMulti } } : {}),
    ...(filters.drinkingMulti?.length ? { drinking: { in: filters.drinkingMulti } } : {}),
    ...(filters.smokingMulti?.length ? { smoking: { in: filters.smokingMulti } } : {}),
    ...(filters.visaStatusMulti?.length ? { visaStatus: { in: filters.visaStatusMulti } } : {}),
    ...(filters.annualIncomeRanges?.length ? { annualIncome: { in: filters.annualIncomeRanges } } : {}),
    ...(filters.annualIncomeCurrency ? { annualIncomeCurrency: filters.annualIncomeCurrency } : {}),
    ...(minHeightCm !== undefined || maxHeightCm !== undefined
      ? { height: { in: getHeightLabelsInCmRange(minHeightCm, maxHeightCm) } }
      : {}),
    ...(Object.keys(dobFilter).length > 0 ? { dob: dobFilter } : {}),
  };

  const [total, profiles] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        religion: { select: { name: true } },
        caste: { select: { name: true } },
        motherTongueRef: { select: { name: true } },
      },
    }),
  ]);

  return { total, profiles, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
