import { getPerformanceReviews } from "@/actions/hr/hr.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";

export default async function PerformancePage() {
  const reviews = await getPerformanceReviews();
  return (
    <div className="space-y-6">
      <DashboardHero title="Performance Reviews" subtitle={`${reviews.length} reviews`} />
      <div className="space-y-2">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-lg border p-3">
            <p className="font-medium">{r.user.name} — Rating: {r.rating}/5</p>
            {r.comments && <p className="text-sm text-muted-foreground">{r.comments}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}