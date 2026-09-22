"use client";

import Link from "next/link";
import { useTransition } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { togglePlanActiveAction, deletePlanAction } from "@/actions/plans/plan.actions";
import { Pencil, Power, PowerOff } from "lucide-react";
import { DeleteRowButton } from "@/components/shared/delete-row-button";

type PlanRow = {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  description: string | null;
  active: boolean;
};

function ToggleButton({ plan }: { plan: PlanRow }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => togglePlanActiveAction(plan.id, !plan.active))}
      className={
        plan.active
          ? "text-destructive hover:bg-destructive/10"
          : "text-emerald-600 hover:bg-emerald-50"
      }
    >
      {plan.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
    </Button>
  );
}

export function PlansTable({ plans }: { plans: PlanRow[] }) {
  const columns: Column<PlanRow>[] = [
    { key: "name", header: "Plan Name", sortable: true },
    {
      key: "price",
      header: "Price",
      sortable: true,
      render: (row) => (
        <span className="tabular-nums">₹{row.price.toLocaleString("en-IN")}</span>
      ),
    },
    {
      key: "durationDays",
      header: "Duration",
      sortable: true,
      render: (row) => `${row.durationDays} days`,
    },
    {
      key: "active",
      header: "Status",
      render: (row) => (
        <Badge
          variant="outline"
          className={
            row.active
              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : "bg-red-100 text-red-700 border-red-200"
          }
        >
          {row.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/admin/plans/${row.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <ToggleButton plan={row} />
          <DeleteRowButton
            onDelete={() => deletePlanAction(row.id)}
            entityLabel="plan"
            entityName={row.name}
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={plans}
      columns={columns}
      searchPlaceholder="Search plans..."
      emptyMessage="No plans yet. Add your first subscription tier."
    />
  );
}