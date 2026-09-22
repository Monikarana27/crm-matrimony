import { DashboardHero } from "@/components/layout/dashboard-hero";
import { PlanForm } from "../plan-form";
import { createPlanAction } from "@/actions/plans/plan.actions";

export default function NewPlanPage() {
  return (
    <div className="space-y-6">
      <DashboardHero
        title="Add Plan"
        subtitle="Create a new subscription tier."
      />
      <PlanForm mode="create" action={createPlanAction} />
    </div>
  );
}