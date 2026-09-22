import { DashboardHero } from "@/components/layout/dashboard-hero";
import { TeamHierarchyManager } from "./team-hierarchy-manager";

export default function TeamHierarchyPage() {
  return (
    <div className="space-y-6">
      <DashboardHero
        title="Team Hierarchy"
        subtitle="Assign employees to Team Leaders and Managers."
      />
      <TeamHierarchyManager />
    </div>
  );
}