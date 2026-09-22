import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { ProfileForm } from "@/app/(dashboard)/dashboard/admin/profiles/profile-form";
import { completeStandaloneProfileAction } from "@/actions/profile-queue/create-standalone-and-complete.actions";

export default async function CompleteStandaloneProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: { partnerPreference: true },
  });
  if (!profile) notFound();

  const dv: Record<string, any> = {
    ...profile,
    ...(profile.partnerPreference
      ? {
          ppMinAge: profile.partnerPreference.minAge,
          ppMaxAge: profile.partnerPreference.maxAge,
          ppMinHeight: profile.partnerPreference.minHeight,
          ppMaxHeight: profile.partnerPreference.maxHeight,
          ppMaritalStatus: profile.partnerPreference.maritalStatus,
          ppMotherTongueId: profile.partnerPreference.motherTongueId,
          ppReligionId: profile.partnerPreference.religionId,
          ppCasteId: profile.partnerPreference.casteId,
          ppManglikStatus: profile.partnerPreference.manglikStatus,
          ppHasChildrenOk: profile.partnerPreference.hasChildrenOk,
          ppCountry: profile.partnerPreference.country,
          ppState: profile.partnerPreference.state,
          ppCity: profile.partnerPreference.city,
          ppQualification: profile.partnerPreference.qualification,
          ppWorkingWith: profile.partnerPreference.workingWith,
          ppProfession: profile.partnerPreference.profession,
          ppAnnualIncome: profile.partnerPreference.annualIncome,
          ppDiet: profile.partnerPreference.diet,
          ppDrinking: profile.partnerPreference.drinking,
          ppSmoking: profile.partnerPreference.smoking,
          ppAboutDesiredPartner: profile.partnerPreference.aboutDesiredPartner,
        }
      : {}),
  };

  const boundAction = completeStandaloneProfileAction.bind(null, profile.id);

  return (
    <div className="space-y-6">
      <DashboardHero title={`Create Profile — ${profile.name}`} subtitle={profile.phone} />
      <ProfileForm mode="edit" defaultValues={dv} action={boundAction} />
    </div>
  );
}
