import { getJobOpenings } from "@/actions/hr/hr.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";

export default async function RecruitmentPage() {
  const openings = await getJobOpenings();
  return (
    <div className="space-y-6">
      <DashboardHero title="Recruitment" subtitle={`${openings.length} open positions`} />
      <div className="space-y-2">
        {openings.map((o) => (
          <div key={o.id} className="rounded-lg border p-3">
            <p className="font-medium">{o.title} ({o.department})</p>
            <p className="text-sm text-muted-foreground">{o.interviews.length} interviews scheduled</p>
          </div>
        ))}
        {openings.length === 0 && <p className="text-sm text-muted-foreground">No open positions.</p>}
      </div>
    </div>
  );
}