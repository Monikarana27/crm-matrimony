import { Card, CardContent } from "@/components/ui/card";
import { OPEN_TO_ALL } from "@/lib/constants/profile-options";
import { prisma } from "@/lib/db/prisma";

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">{title}</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">{children}</div>
      </CardContent>
    </Card>
  );
}

function joinList(arr: string[] | null | undefined): string | null {
  if (!arr || arr.length === 0) return null;
  return arr.join(", ");
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

export async function ProfileDetailSections({ profile }: { profile: any }) {
  const pp = profile.partnerPreference;

  const [ppReligionNames, ppCasteNames, ppMotherTongueNames] = pp
    ? await Promise.all([
        resolveNames(pp.religionIds, "religion"),
        resolveNames(pp.casteIds, "caste"),
        resolveNames(pp.motherTongueIds, "motherTongueRef"),
      ])
    : [null, null, null];

  return (
    <>
      <Section title="BASIC INFO">
        <Row label="Name" value={profile.name} />
        <Row label="Gender" value={profile.gender} />
        <Row
          label="Date of Birth"
          value={profile.dob ? new Date(profile.dob).toLocaleDateString() : null}
        />
        <Row label="Marital Status" value={profile.maritalStatus} />
        <Row label="Height" value={profile.height} />
        <Row label="Weight (kg)" value={profile.weightKg} />
        <Row label="Mother Tongue" value={profile.motherTongueRef?.name} />
        <Row label="Body Type" value={profile.bodyType} />
        <Row label="Complexion" value={profile.complexion} />
        <Row label="Blood Group" value={profile.bloodGroup} />
        <Row label="Health Status" value={profile.healthStatus} />
        <Row label="Native Place" value={profile.nativePlace} />
        <Row label="About" value={profile.aboutYourself} />
      </Section>

      <Section title="LOCATION">
        <Row label="Country" value={profile.country} />
        <Row label="State" value={profile.state} />
        <Row label="City" value={profile.city} />
        <Row label="Citizenship" value={profile.citizenship} />
        <Row label="Country Grew Up In" value={profile.countryGrewUp} />
        <Row label="Visa Status" value={profile.visaStatus} />
      </Section>

      <Section title="RELIGION & HOROSCOPE">
        <Row label="Religion" value={profile.religion?.name} />
        <Row label="Caste" value={profile.caste?.name} />
        <Row label="Sub Caste" value={profile.subCaste} />
        <Row label="Gotra" value={profile.gotra?.name} />
        <Row label="Time of Birth" value={profile.timeOfBirth} />
        <Row label="Place of Birth" value={profile.placeOfBirth} />
        <Row label="Manglik" value={profile.manglik} />
      </Section>

      <Section title="EDUCATION & CAREER">
        <Row label="Highest Qualification" value={profile.highestQualification} />
        <Row label="Education Field" value={profile.educationField} />
        <Row label="Institute" value={profile.institute} />
        <Row label="Work Location" value={profile.workLocation} />
        <Row label="Working With" value={profile.workingWith} />
        <Row label="Profession" value={profile.profession} />
        <Row label="Business Name" value={profile.businessName} />
        <Row label="Designation" value={profile.designation} />
        <Row label="Annual Income" value={profile.annualIncome} />
      </Section>

      <Section title="LIFESTYLE">
        <Row label="Diet" value={profile.diet} />
        <Row label="Drinking" value={profile.drinking} />
        <Row label="Smoking" value={profile.smoking} />
      </Section>

      <Section title="FAMILY">
        <Row label="Father's Occupation" value={profile.fatherOccupation} />
        <Row label="Mother's Occupation" value={profile.motherOccupation} />
        <Row label="Brothers" value={profile.brothers} />
        <Row label="Brothers Married" value={profile.brothersMarried} />
        <Row label="Sisters" value={profile.sisters} />
        <Row label="Sisters Married" value={profile.sistersMarried} />
        <Row label="Family Type" value={profile.familyType} />
        <Row label="Affluence" value={profile.affluence} />
        <Row label="Family Values" value={profile.familyValues} />
        <Row label="Family Annual Income" value={profile.familyAnnualIncome} />
        <Row label="Family Bio" value={profile.familyBio} />
      </Section>

      {pp && (
        <Section title="PARTNER PREFERENCE">
          <Row label="Age Range" value={pp.minAge || pp.maxAge ? `${pp.minAge ?? "-"} to ${pp.maxAge ?? "-"}` : null} />
          <Row label="Height Range" value={pp.minHeight || pp.maxHeight ? `${pp.minHeight ?? "-"} to ${pp.maxHeight ?? "-"}` : null} />
          <Row label="Marital Status" value={joinList(pp.maritalStatusMulti)} />
          <Row label="Mother Tongue" value={ppMotherTongueNames} />
          <Row label="Religion" value={ppReligionNames} />
          <Row label="Caste" value={ppCasteNames} />
          <Row label="Manglik Status" value={joinList(pp.manglikStatusMulti)} />
          <Row label="Children OK" value={joinList(pp.hasChildrenOkMulti)} />
          <Row label="Country" value={joinList(pp.countryMulti)} />
          <Row label="State" value={joinList(pp.stateMulti)} />
          <Row label="City" value={joinList(pp.cityMulti)} />
          <Row label="Qualification" value={joinList(pp.qualificationMulti)} />
          <Row label="Working With" value={pp.workingWith} />
          <Row label="Profession" value={joinList(pp.professionMulti)} />
          <Row
            label="Annual Income"
            value={pp.annualIncomeRanges?.length ? `${pp.annualIncomeCurrency ?? ""} ${joinList(pp.annualIncomeRanges)}`.trim() : null}
          />
          <Row label="Diet" value={joinList(pp.dietMulti)} />
          <Row label="Drinking" value={joinList(pp.drinkingMulti)} />
          <Row label="Smoking" value={joinList(pp.smokingMulti)} />
          <Row label="About Desired Partner" value={pp.aboutDesiredPartner} />
        </Section>
      )}
    </>
  );
}
