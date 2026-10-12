import { DashboardHero } from "@/components/layout/dashboard-hero";
import { TargetReportView } from "@/components/shared/target-report-view";

export default function TargetReportPage() {
  return (
    <div className="space-y-6">
      <DashboardHero
        title="Target Report"
        subtitle="Target, achieved and % by employee and month, over a date range."
      />
      <TargetReportView />
    </div>
  );
}
