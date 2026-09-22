import { notFound } from "next/navigation";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { ProfileForm } from "@/app/(dashboard)/dashboard/admin/profiles/profile-form";
import { getProfileById, updateProfileAction } from "@/actions/profiles/profile.actions";

export default async function EditReturnedProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfileById(id);
  if (!profile) notFound();

  const boundAction = updateProfileAction.bind(null, id);

  return (
    <div className="space-y-6">
      <DashboardHero
        title={`Fix Profile — ${profile.name}`}
        subtitle={profile.approvalNotes ?? "Update the flagged details and resubmit."}
      />
      <ProfileForm mode="edit" defaultValues={profile} action={boundAction} />
    </div>
  );
}