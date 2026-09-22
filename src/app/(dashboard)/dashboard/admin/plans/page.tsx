import Link from "next/link";
import { getPlans } from "@/actions/plans/plan.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PlansTable } from "./plans-table";

export default async function PlansPage() {
  const plans = await getPlans();

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Plans"
        subtitle="Manage subscription tiers available to profiles."
      />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">All Plans</h2>
        <Button asChild>
          <Link href="/dashboard/admin/plans/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Plan
          </Link>
        </Button>
      </div>

      <PlansTable plans={plans} />
    </div>
  );
}