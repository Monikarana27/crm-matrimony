import { getAssignedProfiles, getAssignedLeads } from "@/actions/assignments/assignment.actions";
import { prisma } from "@/lib/db/prisma";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { AssignmentsFilter } from "./assignments-filter";

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string; type?: string }>;
}) {
  const { employeeId, type } = await searchParams;

  const [profiles, leads, employees] = await Promise.all([
    getAssignedProfiles(employeeId),
    getAssignedLeads(employeeId),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Assignments"
        subtitle="See every profile and lead assigned across your team."
      />

      <AssignmentsFilter
        employees={employees}
        profiles={profiles}
        leads={leads}
        currentEmployeeId={employeeId}
        currentType={type}
      />
    
    </div>
  );
} 