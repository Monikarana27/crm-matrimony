import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSystemUserId } from "@/lib/system-user";
import { z } from "zod";
import { regenerateProfileEmbedding } from "@/lib/ai/regenerate-embedding";

const genderMap: Record<string, "MALE" | "FEMALE" | "OTHER"> = {
  Male: "MALE",
  Female: "FEMALE",
};

const arr = () => z.array(z.string()).optional();

const websiteProfileSchema = z.object({
  profileCode: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(6),
  gender: z.string().optional(),
  email: z.string().optional(),
  altEmail: z.string().optional(),
  altPhone: z.string().optional(),
  contactPerson: z.string().optional(),
  creatingFor: z.string().optional(),
  dob: z.string().optional(),
  maritalStatus: z.string().optional(),
  height: z.string().optional(),
  motherTongueOld: z.string().optional(),
  weightKg: z.number().optional(),
  bodyType: z.string().optional(),
  complexion: z.string().optional(),
  bloodGroup: z.string().optional(),
  healthStatus: z.string().optional(),
  nativePlace: z.string().optional(),
  aboutYourself: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  countryGrewUp: z.string().optional(),
  religionOld: z.string().optional(),
  casteOld: z.string().optional(),
  subCaste: z.string().optional(),
  gotraOld: z.string().optional(),
  timeOfBirth: z.string().optional(),
  placeOfBirth: z.string().optional(),
  manglik: z.string().optional(),
  highestQualification: z.string().optional(),
  educationField: z.string().optional(),
  institute: z.string().optional(),
  workLocation: z.string().optional(),
  workingWith: z.string().optional(),
  profession: z.string().optional(),
  businessName: z.string().optional(),
  designation: z.string().optional(),
  annualIncome: z.string().optional(),
  annualIncomeCurrency: z.string().optional(),
  diet: z.string().optional(),
  drinking: z.string().optional(),
  smoking: z.string().optional(),
  fatherOccupation: z.string().optional(),
  motherOccupation: z.string().optional(),
  brothers: z.number().optional(),
  brothersMarried: z.number().optional(),
  sisters: z.number().optional(),
  sistersMarried: z.number().optional(),
  familyType: z.string().optional(),
  affluence: z.string().optional(),
  familyValues: z.string().optional(),
  familyBio: z.string().optional(),
  partnerPreference: z
    .object({
      minAge: z.number().optional(),
      maxAge: z.number().optional(),
      minHeight: z.string().optional(),
      maxHeight: z.string().optional(),
      maritalStatusMulti: arr(),
      manglikStatusMulti: arr(),
      countryMulti: arr(),
      stateMulti: arr(),
      cityMulti: arr(),
      qualificationMulti: arr(),
      professionMulti: arr(),
      dietMulti: arr(),
      drinkingMulti: arr(),
      smokingMulti: arr(),
      workingWith: z.string().optional(),
      annualIncome: z.string().optional(),
      annualIncomeCurrency: z.string().optional(),
      aboutDesiredPartner: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.WEBSITE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = websiteProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const d = parsed.data;

  const existing = await prisma.profile.findFirst({
    where: {
      phone: d.phone,
      name: { equals: d.name.trim(), mode: "insensitive" },
      deletedAt: null,
    },
  });
  if (existing) {
    return NextResponse.json({ success: true, profileId: existing.id, note: "Profile already existed" });
  }

  const systemUserId = await getSystemUserId();
  const gender = genderMap[d.gender ?? ""] ?? "OTHER";

  const profile = await prisma.profile.create({
    data: {
      profileCode: d.profileCode,
      source: "Website",
      sourceInfo: "Website Registration",
      name: d.name,
      phone: d.phone,
      gender,
      email: d.email || null,
      altEmail: d.altEmail || null,
      altPhone: d.altPhone || null,
      contactPerson: d.contactPerson || null,
      creatingFor: d.creatingFor || null,
      dob: d.dob ? new Date(d.dob) : null,
      maritalStatus: d.maritalStatus || null,
      height: d.height || null,
      motherTongueOld: d.motherTongueOld || null,
      weightKg: d.weightKg ?? null,
      bodyType: d.bodyType || null,
      complexion: d.complexion || null,
      bloodGroup: d.bloodGroup || null,
      healthStatus: d.healthStatus || null,
      nativePlace: d.nativePlace || null,
      aboutYourself: d.aboutYourself || null,
      country: d.country || null,
      state: d.state || null,
      city: d.city || null,
      countryGrewUp: d.countryGrewUp || null,
      religionOld: d.religionOld || null,
      casteOld: d.casteOld || null,
      subCaste: d.subCaste || null,
      gotraOld: d.gotraOld || null,
      timeOfBirth: d.timeOfBirth || null,
      placeOfBirth: d.placeOfBirth || null,
      manglik: d.manglik || null,
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
      createdById: systemUserId,
      ...(d.partnerPreference
        ? {
            partnerPreference: {
              create: {
                minAge: d.partnerPreference.minAge ?? null,
                maxAge: d.partnerPreference.maxAge ?? null,
                minHeight: d.partnerPreference.minHeight || null,
                maxHeight: d.partnerPreference.maxHeight || null,
                maritalStatusMulti: d.partnerPreference.maritalStatusMulti ?? [],
                manglikStatusMulti: d.partnerPreference.manglikStatusMulti ?? [],
                countryMulti: d.partnerPreference.countryMulti ?? [],
                stateMulti: d.partnerPreference.stateMulti ?? [],
                cityMulti: d.partnerPreference.cityMulti ?? [],
                qualificationMulti: d.partnerPreference.qualificationMulti ?? [],
                professionMulti: d.partnerPreference.professionMulti ?? [],
                dietMulti: d.partnerPreference.dietMulti ?? [],
                drinkingMulti: d.partnerPreference.drinkingMulti ?? [],
                smokingMulti: d.partnerPreference.smokingMulti ?? [],
                workingWith: d.partnerPreference.workingWith || null,
                annualIncome: d.partnerPreference.annualIncome || null,
                annualIncomeCurrency: d.partnerPreference.annualIncomeCurrency || null,
                aboutDesiredPartner: d.partnerPreference.aboutDesiredPartner || null,
                // religionIds / casteIds / motherTongueIds intentionally left empty —
                // website sends free-text names, not master-data record IDs.
                // Staff resolve these via the searchable dropdowns when processing the profile.
              },
            },
          }
        : {}),
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: systemUserId,
      action: "WEBSITE_PROFILE_REGISTERED",
      entityType: "Profile",
      entityId: profile.id,
    },
  });

  await regenerateProfileEmbedding(profile.id);

  return NextResponse.json({ success: true, profileId: profile.id, profileCode: profile.profileCode });
}
