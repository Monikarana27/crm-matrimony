import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, UserRoundPlus, Users, CalendarPlus } from "lucide-react";

const actions = [
  {
    label: "Add Employee",
    href: "/dashboard/admin/employees/new",
    icon: UserPlus,
  },
  {
    label: "Create Lead",
    href: "/dashboard/admin/leads/new",
    icon: UserRoundPlus,
  },
  {
    label: "Assign Leads",
    href: "/dashboard/admin/leads/assign",
    icon: Users,
  },
  {
    label: "Schedule Meeting",
    href: "/dashboard/admin/meetings/new",
    icon: CalendarPlus,
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 pt-2">
        {actions.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="group flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 text-center text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
              <Icon className="h-4 w-4" />
            </span>
            {label}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
