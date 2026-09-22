import { auth } from "@/lib/auth/auth";
import { getExpiringSubscriptions } from "@/actions/subscriptions/expiry.actions";
import { DashboardHero, heroVariantForRole } from "@/components/layout/dashboard-hero";
import Link from "next/link";

export default async function SalesExpiringSoonPage() {
  const session = await auth();
  const expiring = await getExpiringSubscriptions(30);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Expiring Soon"
        subtitle={`${expiring.length} of your assigned subscriptions expiring within 30 days`}
        variant={heroVariantForRole(session!.user.role)}
      />
      <div className="space-y-2">
        {expiring.map((s) => {
          const daysLeft = Math.ceil((new Date(s.endDate!).getTime() - Date.now()) / 86400000);
          return (
            <div key={s.id} className="flex items-center justify-between rounded-lg border p-4">
              <Link href={`/dashboard/admin/profiles/${s.profile.id}`} className="font-medium hover:underline">
                {s.profile.name} ({s.profile.profileCode}) — {s.plan.name}
              </Link>
              <span className={daysLeft <= 7 ? "text-destructive font-medium" : "text-amber-600"}>
                {daysLeft} days left
              </span>
            </div>
          );
        })}
        {expiring.length === 0 && <p className="text-sm text-muted-foreground">Nothing expiring soon.</p>}
      </div>
    </div>
  );
}
