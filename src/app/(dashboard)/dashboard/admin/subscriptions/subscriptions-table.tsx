"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { updateSubscriptionStatusAction } from "@/actions/subscriptions/subscription.actions";
import { SubscriptionRowActions } from "./subscription-row-actions";

type SubscriptionRow = {
  id: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  followUpDate: Date | null;
  isPaused: boolean;
  pauseDays: number | null;
  profile: { id: string; name: string; profileCode: string };
  plan: { id: string; name: string; price: number };
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  HOLD: "bg-orange-100 text-orange-700 border-orange-200",
  EXPIRED: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  HOLD: "Hold",
  EXPIRED: "Expired",
  PENDING: "Pending (legacy)",
  STOPPED: "Stopped (legacy)",
};

function StatusSelect({ subscription, isAdmin }: { subscription: SubscriptionRow; isAdmin: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(subscription.status);
  const [error, setError] = useState<string | null>(null);

  function handleChange(newStatus: string) {
    setError(null);
    setValue(newStatus);
    startTransition(async () => {
      try {
        await updateSubscriptionStatusAction(subscription.id, newStatus as "ACTIVE" | "HOLD" | "EXPIRED");
      } catch (e) {
        setValue(subscription.status);
        setError(e instanceof Error ? e.message : "Failed to update status.");
      }
    });
  }

  if (!isAdmin) {
    return (
      <Badge variant="outline" className={STATUS_STYLES[value] ?? ""}>
        {STATUS_LABELS[value] ?? value}
      </Badge>
    );
  }

  return (
    <div>
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="HOLD">Hold</SelectItem>
          <SelectItem value="EXPIRED">Expired</SelectItem>
          {(value === "PENDING") && <SelectItem value="PENDING" disabled>Pending (legacy)</SelectItem>}
          {(value === "STOPPED") && <SelectItem value="STOPPED" disabled>Stopped (legacy)</SelectItem>}
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function SubscriptionsTable({
  subscriptions,
  isAdmin,
  showFindMatch = false,
}: {
  subscriptions: SubscriptionRow[];
  isAdmin: boolean;
  showFindMatch?: boolean;
}) {
  const columns: Column<SubscriptionRow>[] = [
    {
      key: "profile",
      header: "Profile",
      render: (row) => (
        <Link
          href={`/dashboard/admin/profiles/${row.profile.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.profile.name}{" "}
          <span className="text-xs text-muted-foreground">
            ({row.profile.profileCode})
          </span>
        </Link>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (row) => (
        <span>
          {row.plan.name}{" "}
          <span className="text-xs text-muted-foreground tabular-nums">
            (₹{row.plan.price.toLocaleString("en-IN")})
          </span>
        </span>
      ),
    },
    {
      key: "startDate",
      header: "Start Date",
      sortable: true,
      accessor: (row) => new Date(row.startDate).getTime(),
      render: (row) => new Date(row.startDate).toLocaleDateString("en-IN"),
    },
    {
      key: "endDate",
      header: "End Date",
      sortable: true,
      accessor: (row) => (row.endDate ? new Date(row.endDate).getTime() : 0),
      render: (row) =>
        row.endDate ? new Date(row.endDate).toLocaleDateString("en-IN") : "—",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div className="flex flex-col gap-1">
          <StatusSelect subscription={row} isAdmin={isAdmin} />
          {row.isPaused && (
            <Badge variant="outline" className="w-fit border-amber-200 bg-amber-100 text-amber-700">
              Paused (+{row.pauseDays}d on resume)
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {showFindMatch && (
            <Button
              variant="outline"
              size="icon"
              asChild
              className="h-8 w-8 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700"
              title="Find Matches"
              aria-label="Find Matches"
            >
              <Link href={`/dashboard/service/matching/${row.profile.id}`}>
                <Heart className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <SubscriptionRowActions subscription={row} isAdmin={isAdmin} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={subscriptions}
      columns={columns}
      searchPlaceholder="Search by profile name..."
      emptyMessage="No subscriptions in this view."
    />
  );
}
