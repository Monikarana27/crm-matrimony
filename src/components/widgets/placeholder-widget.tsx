import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Contact,
  Users,
  CreditCard,
  HeartHandshake,
  UserSquare2,
  CalendarClock,
  Activity,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  "Total Leads": Contact,
  "Active Employees": Users,
  "Pending Payments": CreditCard,
  "Service Requests": HeartHandshake,
  "My Leads": Contact,
  "My Profiles": UserSquare2,
  "Follow-ups Due": CalendarClock,
  "Assigned Profiles": UserSquare2,
  "Meetings Today": CalendarClock,
  "Service Status": Activity,
};

const COLOR_MAP: Record<string, string> = {
  "Total Leads": "bg-blue-50 text-blue-600",
  "Active Employees": "bg-violet-50 text-violet-600",
  "Pending Payments": "bg-amber-50 text-amber-600",
  "Service Requests": "bg-emerald-50 text-emerald-600",
  "My Leads": "bg-blue-50 text-blue-600",
  "My Profiles": "bg-violet-50 text-violet-600",
  "Follow-ups Due": "bg-amber-50 text-amber-600",
  "Assigned Profiles": "bg-violet-50 text-violet-600",
  "Meetings Today": "bg-amber-50 text-amber-600",
  "Service Status": "bg-emerald-50 text-emerald-600",
};

export function PlaceholderWidget({ title }: { title: string }) {
  const Icon = ICON_MAP[title] ?? Activity;
  const colorClass = COLOR_MAP[title] ?? "bg-muted text-muted-foreground";

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
        <p className="mt-2 text-xs text-muted-foreground">
          Data connects in Phase 2
        </p>
      </CardContent>
    </Card>
  );
}