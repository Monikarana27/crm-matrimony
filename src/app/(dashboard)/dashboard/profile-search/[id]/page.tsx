import { notFound } from "next/navigation";
import Link from "next/link";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { getProfileById } from "@/actions/profiles/profile.actions";
import { auth } from "@/lib/auth/auth";
import { getEmployeeExtraModules } from "@/actions/employees/employee-permission.actions";
import { canAccessRoute, type Role } from "@/lib/permissions/roles";
import { BiodataDownloadButton } from "@/components/shared/biodata-download-button";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">{title}</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">{children}</div>
      </CardContent>
    </Card>
  );
}

export default async function ProfileSearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfileById(id);

  if (!profile) {
    notFound();
  }

  const pp = profile.partnerPreference;
  const photos = profile.documents ?? [];

  const session = await auth();
  const role = session?.user?.role as Role | undefined;
  const extraModules = session?.user?.id
    ? await getEmployeeExtraModules(session.user.id)
    : [];
  const canEdit = role ? canAccessRoute(role, "/dashboard/admin/profiles", extraModules) : false;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <DashboardHero
          title={profile.name}
          subtitle={`Profile ID: ${profile.profileCode}`}
        />
        <div className="flex items-center gap-2">
          <BiodataDownloadButton profileId={profile.id} />
          {canEdit && (
            <Button asChild>
              <Link href={`/dashboard/admin/profiles/${profile.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Profile
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{profile.status}</Badge>
        <Badge variant="outline">{profile.approvalStatus}</Badge>
        {profile.assignedTo && (
          <Badge variant="outline">Assigned to {profile.assignedTo.name}</Badge>
        )}
      </div>

      {photos.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground">PHOTOS</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {photos.map((doc, idx) => (
                <div key={doc.id} className="relative aspect-square overflow-hidden rounded-lg border">
                  <img src={doc.url} className="h-full w-full object-cover" alt="" />
                  {idx === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Section title="SOURCE & CONTACT">
        <Row label="Source" value={profile.source} />
        <Row label="Source Info" value={profile.sourceInfo} />
        <Row label="Email" value={profile.email} />
        <Row label="Alt Email" value={profile.altEmail} />
        <Row label="Phone" value={profile.phone} />
        <Row label="Alt Phone" value={profile.altPhone} />
        <Row label="Contact Person" value={profile.contactPerson} />
        <Row label="Creating For" value={profile.creatingFor} />
      </Section>

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
          <Row label="Marital Status" value={pp.maritalStatus} />
          <Row label="Mother Tongue" value={pp.motherTongueRef?.name} />
          <Row label="Religion" value={pp.religion?.name} />
          <Row label="Caste" value={pp.caste?.name} />
          <Row label="Manglik Status" value={pp.manglikStatus} />
          <Row label="Children OK" value={pp.hasChildrenOk} />
          <Row label="Country" value={pp.country} />
          <Row label="State" value={pp.state} />
          <Row label="City" value={pp.city} />
          <Row label="Qualification" value={pp.qualification} />
          <Row label="Working With" value={pp.workingWith} />
          <Row label="Profession" value={pp.profession} />
          <Row label="Annual Income" value={pp.annualIncome} />
          <Row label="Diet" value={pp.diet} />
          <Row label="Drinking" value={pp.drinking} />
          <Row label="Smoking" value={pp.smoking} />
          <Row label="About Desired Partner" value={pp.aboutDesiredPartner} />
        </Section>
      )}
    </div>
  );
}
