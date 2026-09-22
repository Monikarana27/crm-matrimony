import { DashboardHero } from "@/components/layout/dashboard-hero";
import { prisma } from "@/lib/db/prisma";
import { createSubscriptionAction } from "@/actions/subscriptions/subscription.actions";
import { AttachSubscriptionForm } from "./attach-subscription-form";

export default async function NewSubscriptionPage() {
  const [profiles, plans] = await Promise.all([
    prisma.profile.findMany({
      select: { id: true, name: true, profileCode: true },
      orderBy: { name: "asc" },
    }),
    prisma.plan.findMany({
      where: { active: true },
      select: { id: true, name: true, price: true, durationDays: true },
      orderBy: { price: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Attach Subscription"
        subtitle="Assign a subscription plan to a profile."
      />
      <AttachSubscriptionForm
        profiles={profiles}
        plans={plans}
        action={createSubscriptionAction}
      />
    </div>
  );
}
