import { z } from "zod";

export const profileSchema = z.object({
  // Source
  source: z.string().optional(),
  sourceInfo: z.string().optional(),

  // Contact
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  altEmail: z.string().optional(),
  phone: z.string().min(6, "Phone number is required"),
  altPhone: z.string().optional(),
  contactPerson: z.string().optional(),
  creatingFor: z.string().optional(),

  // Basic Info
  name: z.string().min(2, "Name is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { message: "Select a gender" }),
  dob: z.string().optional(),
  maritalStatus: z.string().optional(),
  height: z.string().optional(),
  weightKg: z.coerce.number().optional().or(z.literal("").transform(() => undefined)),
  motherTongueId: z.string().optional(),
  bodyType: z.string().optional(),
  complexion: z.string().optional(),
  bloodGroup: z.string().optional(),
  healthStatus: z.string().optional(),
  nativePlace: z.string().optional(),
  aboutYourself: z.string().optional(),

  // Location
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  citizenship: z.string().optional(),
  countryGrewUp: z.string().optional(),
  visaStatus: z.string().optional(),

  // Religion & Horoscope
  religionId: z.string().optional(),
  casteId: z.string().optional(),
  subCaste: z.string().optional(),
  gotraId: z.string().optional(),
  timeOfBirth: z.string().optional(),
  placeOfBirth: z.string().optional(),
  manglik: z.string().optional(),
  rashi: z.string().optional(),
  nakshatra: z.string().optional(),

  // Education & Career
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

  // Lifestyle
  diet: z.string().optional(),
  drinking: z.string().optional(),
  smoking: z.string().optional(),

  // Family
  fatherOccupation: z.string().optional(),
  motherOccupation: z.string().optional(),
  brothers: z.coerce.number().optional(),
  brothersMarried: z.coerce.number().optional(),
  sisters: z.coerce.number().optional(),
  sistersMarried: z.coerce.number().optional(),
  familyType: z.string().optional(),
  affluence: z.string().optional(),
  familyValues: z.string().optional(),
  familyBio: z.string().optional(),
  familyAnnualIncome: z.string().optional(),
  familyAnnualIncomeCurrency: z.string().optional(),
  familyNetWorth: z.string().optional(),
  familyNetWorthCurrency: z.string().optional(),

  // Partner Preference (Tab 8) — multi-select fields are arrays
  ppMinAge: z.coerce.number().optional(),
  ppMaxAge: z.coerce.number().optional(),
  ppMinHeight: z.string().optional(),
  ppMaxHeight: z.string().optional(),
  ppMaritalStatus: z.array(z.string()).optional(),
  ppMotherTongueId: z.array(z.string()).optional(),
  ppReligionId: z.array(z.string()).optional(),
  ppCasteId: z.array(z.string()).optional(),
  ppManglikStatus: z.array(z.string()).optional(),
  ppHasChildrenOk: z.array(z.string()).optional(),
  ppCountry: z.array(z.string()).optional(),
  ppState: z.array(z.string()).optional(),
  ppCity: z.array(z.string()).optional(),
  ppQualification: z.array(z.string()).optional(),
  ppWorkingWith: z.string().optional(),
  ppProfession: z.array(z.string()).optional(),
  ppAnnualIncomeCurrency: z.string().optional(),
  ppAnnualIncomeRanges: z.array(z.string()).optional(),
  ppDiet: z.array(z.string()).optional(),
  ppDrinking: z.array(z.string()).optional(),
  ppSmoking: z.array(z.string()).optional(),
  ppVisaStatus: z.array(z.string()).optional(),
  ppAboutDesiredPartner: z.string().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
