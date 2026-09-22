import { DashboardHero } from "@/components/layout/dashboard-hero";
import { ProfileForm } from "../profile-form";
import { createProfileAction } from "@/actions/profiles/profile.actions";

export default function NewProfilePage() {
  return (
    <div className="space-y-6">
      <DashboardHero
        title="Add Profile"
        subtitle="Create a new matrimonial profile record."
      />
      <ProfileForm mode="create" action={createProfileAction} />
    </div>
  );
}