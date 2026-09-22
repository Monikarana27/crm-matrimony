import { DashboardHero } from "@/components/layout/dashboard-hero";
import { getWorkspaceFeed } from "@/actions/workspace/workspace.actions";
import { WorkspaceFeed } from "./workspace-feed";

export default async function WorkspacePage() {
  const messages = await getWorkspaceFeed();

  return (
    <div className="space-y-6">
      <DashboardHero title="Workspace" subtitle="Company-wide discussion for all employees." />
      <WorkspaceFeed initialMessages={messages as any} />
    </div>
  );
}