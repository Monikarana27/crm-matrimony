import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { ProfileForm } from "@/app/(dashboard)/dashboard/admin/profiles/profile-form";
import { markQueueInProgressAction } from "@/actions/profile-queue/profile-queue.actions";
import {
  createDraftProfileFromQueueAction,
  updateAndCompleteQueueAction,
} from "@/actions/profile-queue/create-draft-and-complete.actions";
import { StartForm } from "./start-form";

export default async function CreateFromQueuePage({ params }: { params: Promise<{ queueId: string }> }) {
  const { queueId } = await params;
  const queueEntry = await prisma.profileQueue.findUnique({
    where: { id: queueId },
    include: { lead: true },
  });
  if (!queueEntry) notFound();

  await markQueueInProgressAction(queueId);

  if (!queueEntry.createdProfileId) {
    const boundDraftAction = createDraftProfileFromQueueAction.bind(null,queueId);
    return (
      <div className="space-y-6">
        <DashboardHero title={`Create Profile — ${queueEntry.lead.name}`} subtitle={queueEntry.lead.phone} />
        <StartForm
          defaultValues={{ name: queueEntry.lead.name, phone: queueEntry.lead.phone, email: queueEntry.lead.email }}
          action={boundDraftAction}
        />
      </div>
    );
  }

  const profile = await prisma.profile.findUnique({
    where: { id: queueEntry.createdProfileId },
    include: { partnerPreference: true },
  });
  if (!profile) notFound();

  // NOTE: `...profile` below already spreads religionId/casteId/gotraId/motherTongueId
  // directly (those are scalar FK fields on Profile now), so the top-level profile
  // fields need no remapping here — only the pp* (partner preference) fields do,
  // since those get renamed to ppXId to match the updated zod schema.
  const dv: Record<string, any> = {
    ...profile,
    ...(profile.partnerPreference
      ? {
          ppMinAge: profile.partnerPreference.minAge,
          ppMaxAge: profile.partnerPreference.maxAge,
          ppMinHeight: profile.partnerPreference.minHeight,
          ppMaxHeight: profile.partnerPreference.maxHeight,
          ppMaritalStatus: profile.partnerPreference.maritalStatus,
          ppMotherTongueId: profile.partnerPreference.motherTongueId, // CHANGED
          ppReligionId: profile.partnerPreference.religionId,         // CHANGED
          ppCasteId: profile.partnerPreference.casteId,               // CHANGED
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

  const boundAction = updateAndCompleteQueueAction.bind(null, queueId, profile.id);

  return (
    <div className="space-y-6">
      <DashboardHero title={`Create Profile — ${profile.name}`} subtitle={profile.phone} />
      <ProfileForm mode="edit" defaultValues={dv} action={boundAction} />
    </div>
  );
}
