import { getSmeFollowUps } from "@/lib/stats/sme-follow-ups";
import { getActiveServiceEmployees } from "@/lib/stats/sme-feedback";
import { SmeFollowUpTracker } from "@/components/sme/sme-follow-up-tracker";

export async function SmeFollowUpTab() {
  const [followUps, employees] = await Promise.all([
    getSmeFollowUps(),
    getActiveServiceEmployees(),
  ]);
  return <SmeFollowUpTracker followUps={followUps} employees={employees} />;
}
