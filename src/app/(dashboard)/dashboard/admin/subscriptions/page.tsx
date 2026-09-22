import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getSubscriptions, getPausedSubscriptions } from "@/actions/subscriptions/subscription.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SubscriptionsTable } from "./subscriptions-table";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const session = await auth();
  const isAdmin = !!session?.user && ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);

  const isPausedTab = status === "PAUSED";
  const validStatus: "ACTIVE" | "HOLD" = status === "HOLD" ? "HOLD" : "ACTIVE";

  const subscriptions = isPausedTab
    ? await getPausedSubscriptions()
    : await getSubscriptions({ status: validStatus });

  const tabs = [
    { label: "Ongoing Services", value: "ACTIVE" },
    { label: "Hold", value: "HOLD" },
    { label: "Paused", value: "PAUSED" },
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Subscriptions"
        subtitle="Manage active subscriptions across your profiles."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = (isPausedTab && tab.value === "PAUSED") || (!isPausedTab && validStatus === tab.value);
            const href = `/dashboard/admin/subscriptions?status=${tab.value}`;
            return (
              <Link
                key={tab.label}
                href={href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/subscriptions/new">
            <Plus className="mr-2 h-4 w-4" />
            Attach Subscription
          </Link>
        </Button>
      </div>

      <SubscriptionsTable subscriptions={subscriptions} isAdmin={isAdmin} showFindMatch />
    </div>
  );
}
