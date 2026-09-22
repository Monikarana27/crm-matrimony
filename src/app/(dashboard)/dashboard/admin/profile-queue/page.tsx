import { getProfileQueue } from "@/actions/profile-queue/profile-queue.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Badge } from "@/components/ui/badge";

export default async function AdminProfileQueuePage() {
  const queue = await getProfileQueue();

  return (
    <div className="space-y-6">
      <DashboardHero title="Profile Creation Queue" subtitle={`${queue.length} leads waiting`} />
      <div className="space-y-2">
        {queue.map((q) => (
          <div key={q.id} className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{q.lead.name}</p>
              <p className="text-sm text-muted-foreground">{q.lead.phone}</p>
            </div>
            <Badge variant="outline">{q.status}</Badge>
          </div>
        ))}
        {queue.length === 0 && <p className="text-sm text-muted-foreground">No leads currently in queue.</p>}
      </div>
    </div>
  );
}