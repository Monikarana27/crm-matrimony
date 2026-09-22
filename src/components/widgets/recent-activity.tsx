import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityItem {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  createdAt: Date;
}

function formatAction(action: string) {
  return action.toLowerCase().split("_").join(" ");
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
        <p className="text-xs text-muted-foreground">Latest actions across the CRM</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-2">
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No activity yet</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
            <div className="flex-1">
              <span className="font-medium">{item.actorName}</span>{" "}
              <span className="text-muted-foreground">{formatAction(item.action)}</span>{" "}
              <span className="text-muted-foreground">({item.entityType})</span>
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
              {timeAgo(item.createdAt)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
