import { getLeads } from "@/actions/leads/lead.actions";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { LeadsTable } from "../leads-table";

export default async function MetaEnquiriesPage() {
  const session = await auth();
  const role = session!.user.role;
  const canAssign = role === "ADMIN" || role === "SUPER_ADMIN";

  if (!canAssign) {
    redirect("/dashboard");
  }

  const leads = await getLeads({ sourceStartsWith: "Meta", unassignedOnly: true });

  const employees = await prisma.user.findMany({
    where: {
      active: true,
      OR: [
        { role: { in: ["SALES", "SALES_TL", "SALES_MANAGER"] } },
        { id: "cmtikr0sw0007l39ioxk0lgns" },
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Meta Enquiries"
        subtitle="Leads from Facebook and Instagram lead ads. Review and assign to sales."
      />
      <LeadsTable leads={leads} employees={employees} canAssign={canAssign} />
    </div>
  );
}
