import { DashboardHero } from "@/components/layout/dashboard-hero";
import { prisma } from "@/lib/db/prisma";
import { BulkAssignForm } from "./bulk-assign-form";

export default async function AssignLeadsPage() {
  const [leads, employees] = await Promise.all([
    prisma.lead.findMany({
      where: { assignedToId: null },
      select: { id: true, name: true, phone: true, status: true, source: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Assign Leads"
        subtitle="Bulk assign unassigned leads to your sales team."
      />
      <BulkAssignForm leads={leads} employees={employees} />
    </div>
  );
}
