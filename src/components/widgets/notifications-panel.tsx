import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Clock, TrendingDown, Bell } from "lucide-react";
import type { NotificationItem } from "@/lib/stats/notifications";

const ICONS = {
  approval: { Icon: ClipboardCheck, colorClass: "text-amber-600 bg-amber-50 border-amber-200" },
  meeting: { Icon: Clock, colorClass: "text-blue-600 bg-blue-50 border-blue-200" },
  target_missed: { Icon: TrendingDown, colorClass: "text-red-600 bg-red-50 border-red-200" },
};

export function NotificationsPanel({ items }: { items: NotificationItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Bell className="h-4 w-4" />
          Notifications
        </CardTitle>
        {items.length > 0 && (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
            {items.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-2">
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up</p>
        )}
        {items.map((item) => {
          const { Icon, colorClass } = ICONS[item.type];
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent/10"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
