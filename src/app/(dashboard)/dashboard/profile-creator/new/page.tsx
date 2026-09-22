import { DashboardHero } from "@/components/layout/dashboard-hero";
import { createStandaloneProfileAction } from "@/actions/profile-queue/create-standalone-and-complete.actions";
import { StartForm } from "../create/[queueId]/start-form";

export default function NewStandaloneProfilePage() {
  return (
    <div className="space-y-6">
      <DashboardHero
        title="Create Profile"
        subtitle="Start a profile from scratch — no assigned lead required."
      />
      <StartForm
        defaultValues={{ name: "", phone: "", email: "" }}
        action={createStandaloneProfileAction}
      />
    </div>
  );
}
