import { DashboardHero } from "@/components/layout/dashboard-hero";
import { createMeetingAction } from "@/actions/meetings/meeting.actions";
import { ScheduleMeetingForm } from "./schedule-meeting-form";

export default async function NewMeetingPage() {
  return (
    <div className="space-y-6">
      <DashboardHero
        title="Schedule Meeting"
        subtitle="Set up a face-to-face or tele meeting for a profile."
      />
      <ScheduleMeetingForm action={createMeetingAction} />
    </div>
  );
}
