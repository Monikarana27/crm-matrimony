import { notFound } from "next/navigation";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { PlanForm } from "../../plan-form";
import { getPlanById, updatePlanAction } from "@/actions/plans/plan.actions";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await getPlanById(id);

  if (!plan) {
    notFound();
  }

  const boundAction = updatePlanAction.bind(null, id);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Edit Plan"
        subtitle={`Update details for ${plan.name}.`}
      />
      <PlanForm mode="edit" defaultValues={plan} action={boundAction} />
    </div>
  );
}