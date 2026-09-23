import { getLeads } from "@/actions/leads/lead.actions";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { LeadsTable } from "../leads-table";

export default async function WebsiteEnquiriesPage() {
  const session = await auth();
  const role = session!.user.role;
  const canAssign = role === "ADMIN" || role === "SUPER_ADMIN";

  if (!canAssign) {
    redirect("/dashboard");
  }

  const leads = await getLeads({ sourceStartsWith: "Website", unassignedOnly: true });

  const employees = await prisma.user.findMany({
    // Devender Kumar (SERVICE_MANAGER) has cross-access to the Sales side and
        // should also appear as a lead assignee, even though his role isn't a SALES_*
        // one — included by id rather than broadening the role filter, since that
        // would also pull in other SERVICE_MANAGERs (e.g. Shahina Sheikh).
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
        title="Website Enquiries"
        subtitle="Enquiries submitted directly from elitebandhan.com — review and assign to sales."
      />
      <LeadsTable leads={leads} employees={employees} canAssign={canAssign} />
    </div>
  );
}
