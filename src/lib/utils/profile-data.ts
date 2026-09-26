import { profileSchema } from "@/lib/validations/profile.schema";

const MULTI_VALUE_FIELDS = new Set([
  "ppMaritalStatus",
  "ppMotherTongueId",
  "ppReligionId",
  "ppCasteId",
  "ppManglikStatus",
  "ppHasChildrenOk",
  "ppCountry",
  "ppState",
  "ppCity",
  "ppQualification",
  "ppProfession",
  "ppAnnualIncomeRanges",
  "ppDiet",
  "ppDrinking",
  "ppSmoking",
  "ppVisaStatus",
]);

// Converts a submitted FormData into a plain object suitable for profileSchema.safeParse.
// Unlike Object.fromEntries(formData.entries()), this preserves ALL values for fields
// that can be submitted multiple times (multi-select comboboxes render one hidden
// <input> per selected value under the same field name).
export function formDataToProfileRaw(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  const seenKeys = new Set<string>();
  for (const key of formData.keys()) {
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    if (MULTI_VALUE_FIELDS.has(key)) {
      raw[key] = formData
        .getAll(key)
        .filter((v): v is string => typeof v === "string" && v !== "");
    } else {
      raw[key] = formData.get(key);
    }
  }
  return raw;
}

export function extractProfileData(parsed: ReturnType<typeof profileSchema.safeParse>) {
  if (!parsed.success) return null;
  const d = parsed.data;
  return {
    source: d.source || null,
    sourceInfo: d.sourceInfo || null,
    email: d.email || null,
    altEmail: d.altEmail || null,
    phone: d.phone,
    altPhone: d.altPhone || null,
    contactPerson: d.contactPerson || null,
    creatingFor: d.creatingFor || null,
    name: d.name,
    gender: d.gender,
    dob: d.dob ? new Date(d.dob) : null,
    maritalStatus: d.maritalStatus || null,
    height: d.height || null,
    weightKg: d.weightKg || null,
    motherTongueId: d.motherTongueId || null,
    bodyType: d.bodyType || null,
    complexion: d.complexion || null,
    bloodGroup: d.bloodGroup || null,
    healthStatus: d.healthStatus || null,
    nativePlace: d.nativePlace || null,
    aboutYourself: d.aboutYourself || null,
    country: d.country || null,
    state: d.state || null,
    city: d.city || null,
    citizenship: d.citizenship || null,
    countryGrewUp: d.countryGrewUp || null,
    visaStatus: d.visaStatus || null,
    religionId: d.religionId || null,
    casteId: d.casteId || null,
    subCaste: d.subCaste || null,
    gotraId: d.gotraId || null,
    timeOfBirth: d.timeOfBirth || null,
    placeOfBirth: d.placeOfBirth || null,
    manglik: d.manglik || null,
    rashi: d.rashi || null,
    nakshatra: d.nakshatra || null,
    highestQualification: d.highestQualification || null,
    educationField: d.educationField || null,
    institute: d.institute || null,
    workLocation: d.workLocation || null,
    workingWith: d.workingWith || null,
    profession: d.profession || null,
    businessName: d.businessName || null,
    designation: d.designation || null,
    annualIncome: d.annualIncome || null,
    annualIncomeCurrency: d.annualIncomeCurrency || null,
    diet: d.diet || null,
    drinking: d.drinking || null,
    smoking: d.smoking || null,
    fatherOccupation: d.fatherOccupation || null,
    motherOccupation: d.motherOccupation || null,
    brothers: d.brothers ?? 0,
    brothersMarried: d.brothersMarried ?? 0,
    sisters: d.sisters ?? 0,
    sistersMarried: d.sistersMarried ?? 0,
    familyType: d.familyType || null,
    affluence: d.affluence || null,
    familyValues: d.familyValues || null,
    familyBio: d.familyBio || null,
    familyAnnualIncome: d.familyAnnualIncome || null,
    familyAnnualIncomeCurrency: d.familyAnnualIncomeCurrency || null,
    familyNetWorth: d.familyNetWorth || null,
    familyNetWorthCurrency: d.familyNetWorthCurrency || null,
  };
}

export function extractPartnerPreferenceData(parsed: ReturnType<typeof profileSchema.safeParse>) {
  if (!parsed.success) return null;
  const d = parsed.data;
  return {
    minAge: d.ppMinAge ?? null,
    maxAge: d.ppMaxAge ?? null,
    minHeight: d.ppMinHeight || null,
    maxHeight: d.ppMaxHeight || null,
    maritalStatusMulti: d.ppMaritalStatus ?? [],
    motherTongueIds: d.ppMotherTongueId ?? [],
    religionIds: d.ppReligionId ?? [],
    casteIds: d.ppCasteId ?? [],
    manglikStatusMulti: d.ppManglikStatus ?? [],
    hasChildrenOkMulti: d.ppHasChildrenOk ?? [],
    countryMulti: d.ppCountry ?? [],
    stateMulti: d.ppState ?? [],
    cityMulti: d.ppCity ?? [],
    qualificationMulti: d.ppQualification ?? [],
    workingWith: d.ppWorkingWith || null,
    professionMulti: d.ppProfession ?? [],
    annualIncomeCurrency: d.ppAnnualIncomeCurrency || null,
    annualIncomeRanges: d.ppAnnualIncomeRanges ?? [],
    dietMulti: d.ppDiet ?? [],
    drinkingMulti: d.ppDrinking ?? [],
    smokingMulti: d.ppSmoking ?? [],
    visaStatusMulti: d.ppVisaStatus ?? [],
    aboutDesiredPartner: d.ppAboutDesiredPartner || null,
  };
}
