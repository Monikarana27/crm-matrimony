import { DashboardHero } from "@/components/layout/dashboard-hero";
import { prisma } from "@/lib/db/prisma";
import { createPaymentAction } from "@/actions/payments/payment.actions";
import { RecordPaymentForm } from "./record-payment-form";

export default async function NewPaymentPage() {
  const [subscriptions, employees] = await Promise.all([
    prisma.subscription.findMany({
      include: {
        profile: { select: { id: true, name: true, profileCode: true } },
        plan: { select: { id: true, name: true, price: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { active: true, role: { in: ["SALES", "SALES_TL", "SALES_MANAGER", "SERVICE", "SERVICE_TL", "SERVICE_MANAGER"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Record Payment"
        subtitle="Log a payment against an active subscription."
      />
      <RecordPaymentForm subscriptions={subscriptions} employees={employees} action={createPaymentAction} />
    </div>
  );
}
