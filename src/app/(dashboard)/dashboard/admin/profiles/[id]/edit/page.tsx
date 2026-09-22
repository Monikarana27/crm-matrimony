import { notFound } from "next/navigation";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { ProfileForm } from "../../profile-form";
import {
  getMyProfileById,
  updateProfileAction,
} from "@/actions/profiles/profile.actions";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getMyProfileById(id);

  if (!profile) {
    notFound();
  }

  const boundAction = updateProfileAction.bind(null, id);

  return (
    <div className="space-y-6">
      <DashboardHero
        title={`Edit Profile — ${profile.name}`}
        subtitle={`Profile ID: ${profile.profileCode}`}
      />
      <ProfileForm
        mode="edit"
        defaultValues={profile}
        action={boundAction}
      />
    </div>
  );
}