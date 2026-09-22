import { prisma } from "@/lib/db/prisma";
import { OPEN_TO_ALL } from "@/lib/constants/profile-options";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

function calculateAge(dob: Date | null): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const JPEG_COMPATIBLE = new Set([".jpg", ".jpeg", ".png"]);

function joinList(arr: string[] | null | undefined): string | null {
  if (!arr || arr.length === 0) return null;
  return arr.join(", ");
}

// @react-pdf/renderer (pdfkit under the hood) can only embed JPEG/PNG.
// Anything else (webp, avif, etc. — common from mobile uploads) needs to be
// transcoded to JPEG first, or the image silently fails to render in the PDF.
async function resolvePhotoDataUri(photoUrl: string | null): Promise<string | null> {
  if (!photoUrl) return null;
  if (!photoUrl.startsWith("/uploads/")) return photoUrl;

  try {
    const ext = path.extname(photoUrl).toLowerCase();
    const absolutePath = path.join(process.cwd(), "public", photoUrl);
    const fileBuffer = await readFile(absolutePath);

    if (JPEG_COMPATIBLE.has(ext)) {
      const mime = ext === ".png" ? "image/png" : "image/jpeg";
      return `data:${mime};base64,${fileBuffer.toString("base64")}`;
    }

    const jpegBuffer = await sharp(fileBuffer).jpeg({ quality: 88 }).toBuffer();
    return `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;
  } catch (err) {
    console.error(`Could not read/convert profile photo at ${photoUrl}:`, err);
    return null;
  }
}

async function resolveNames(ids: string[] | null | undefined, table: "religion" | "caste" | "motherTongueRef"): Promise<string | null> {
  if (!ids || ids.length === 0) return null;
  if (ids.includes(OPEN_TO_ALL)) return OPEN_TO_ALL;
  let rows: { name: string }[] = [];
  if (table === "religion") rows = await prisma.religion.findMany({ where: { id: { in: ids } }, select: { name: true } });
  if (table === "caste") rows = await prisma.caste.findMany({ where: { id: { in: ids } }, select: { name: true } });
  if (table === "motherTongueRef") rows = await prisma.motherTongueRef.findMany({ where: { id: { in: ids } }, select: { name: true } });
  return rows.length ? rows.map((r) => r.name).join(", ") : null;
}

export async function buildBiodataData(profileId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      partnerPreference: {
        include: { religion: true, caste: true, motherTongueRef: true },
      },
      religion: true,
      caste: true,
      gotra: true,
      motherTongueRef: true,
      documents: {
        where: { type: "PHOTO" },
        orderBy: { order: "asc" },
        take: 4,
      },
    },
  });
  if (!profile) return null;

  // Prefer the first ordered PHOTO document as the main photo — this is
  // reliably populated from the old-CRM migration. Profile.photoUrl is
  // empty for most migrated profiles, so it's only a fallback.
  const mainPhotoSource = profile.documents[0]?.url ?? profile.photoUrl;
  const galleryDocs = profile.documents.slice(profile.documents[0] ? 1 : 0, 4);

  const [photoDataUri, galleryPhotos] = await Promise.all([
    resolvePhotoDataUri(mainPhotoSource),
    Promise.all(galleryDocs.map((d) => resolvePhotoDataUri(d.url))),
  ]);

  return {
    name: profile.name,
    profileCode: profile.profileCode,
    contactPerson: profile.contactPerson,
    creatingFor: profile.creatingFor,
    photoUrl: photoDataUri,
    galleryPhotos: galleryPhotos.filter((p): p is string => !!p),
    gender: profile.gender,
    age: calculateAge(profile.dob),
    dob: profile.dob,
    height: profile.height,
    weightKg: profile.weightKg,
    maritalStatus: profile.maritalStatus,
    motherTongue: profile.motherTongueRef?.name ?? null,
    bodyType: profile.bodyType,
    complexion: profile.complexion,
    bloodGroup: profile.bloodGroup,
    healthStatus: profile.healthStatus,
    nativePlace: profile.nativePlace,
    aboutYourself: profile.aboutYourself,
    city: profile.city,
    state: profile.state,
    country: profile.country,
    citizenship: profile.citizenship,
    visaStatus: profile.visaStatus,
    religion: profile.religion?.name ?? null,
    caste: profile.caste?.name ?? null,
    subCaste: profile.subCaste,
    gotra: profile.gotra?.name ?? null,
    timeOfBirth: profile.timeOfBirth,
    placeOfBirth: profile.placeOfBirth,
    manglik: profile.manglik,
    rashi: profile.rashi,
    nakshatra: profile.nakshatra,
    highestQualification: profile.highestQualification,
    educationField: profile.educationField,
    institute: profile.institute,
    profession: profile.profession,
    workingWith: profile.workingWith,
    designation: profile.designation,
    annualIncome: profile.annualIncome,
    diet: profile.diet,
    drinking: profile.drinking,
    smoking: profile.smoking,
    fatherOccupation: profile.fatherOccupation,
    motherOccupation: profile.motherOccupation,
    brothers: profile.brothers,
    brothersMarried: profile.brothersMarried,
    sisters: profile.sisters,
    sistersMarried: profile.sistersMarried,
    familyType: profile.familyType,
    familyValues: profile.familyValues,
    familyBio: profile.familyBio,
    familyAnnualIncome: profile.familyAnnualIncome,
    familyNetWorth: profile.familyNetWorth,
    partnerPreference: profile.partnerPreference
      ? {
          minAge: profile.partnerPreference.minAge,
          maxAge: profile.partnerPreference.maxAge,
          minHeight: profile.partnerPreference.minHeight,
          maxHeight: profile.partnerPreference.maxHeight,
          maritalStatus: joinList(profile.partnerPreference.maritalStatusMulti),
          religion: await resolveNames(profile.partnerPreference.religionIds, "religion"),
          caste: await resolveNames(profile.partnerPreference.casteIds, "caste"),
          motherTongue: await resolveNames(profile.partnerPreference.motherTongueIds, "motherTongueRef"),
          manglikStatus: joinList(profile.partnerPreference.manglikStatusMulti),
          hasChildrenOk: joinList(profile.partnerPreference.hasChildrenOkMulti),
          country: joinList(profile.partnerPreference.countryMulti),
          state: joinList(profile.partnerPreference.stateMulti),
          city: joinList(profile.partnerPreference.cityMulti),
          qualification: joinList(profile.partnerPreference.qualificationMulti),
          workingWith: profile.partnerPreference.workingWith,
          profession: joinList(profile.partnerPreference.professionMulti),
          annualIncome: profile.partnerPreference.annualIncomeRanges?.length
            ? `${profile.partnerPreference.annualIncomeCurrency ?? ""} ${joinList(profile.partnerPreference.annualIncomeRanges)}`.trim()
            : null,
          diet: joinList(profile.partnerPreference.dietMulti),
          drinking: joinList(profile.partnerPreference.drinkingMulti),
          smoking: joinList(profile.partnerPreference.smokingMulti),
          aboutDesiredPartner: profile.partnerPreference.aboutDesiredPartner,
        }
      : null,
  };
}

export type BiodataData = NonNullable<Awaited<ReturnType<typeof buildBiodataData>>>;
