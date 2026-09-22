import { auth } from "@/lib/auth/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/actions/auth/login.action";
import { LogOut, User } from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { CommandPalette } from "@/components/layout/command-palette";
import { AttendanceWidget } from "@/components/layout/attendance-widget";
import { getMyTodayAttendance } from "@/actions/attendance/attendance.actions";
import type { Role } from "@/lib/permissions/roles";
import { ROLE_LABEL } from "@/components/layout/sidebar";
const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-700 border-violet-200",
  SALES: "bg-blue-100 text-blue-700 border-blue-200",
  SERVICE: "bg-emerald-100 text-emerald-700 border-emerald-200",
};
export async function Header({ role }: { role: Role }) {
  const session = await auth();
  const attendance = await getMyTodayAttendance();
  const name = session?.user?.name ?? "User";
  const userRole = session?.user?.role ?? "USER";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 backdrop-blur px-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          EB
        </div>
        <span className="font-semibold tracking-tight">Elite Bandhan CRM</span>
      </div>
      <CommandPalette role={role} />
      <div className="flex items-center gap-3">
      <AttendanceWidget attendance={attendance} />
      <NotificationBell role={role} />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-full py-1 pl-2 pr-1 outline-none transition-colors hover:bg-muted">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-sm font-medium">{name}</span>
            <Badge
              variant="outline"
              className={`h-4 px-1.5 text-[10px] font-semibold ${ROLE_STYLES[role] ?? ""}`}
            >
              {ROLE_LABEL[role] ?? role}
            </Badge>
          </div>
          <Avatar className="h-9 w-9 border">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Signed in as
          </DropdownMenuLabel>
          <DropdownMenuItem className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            {session?.user?.email}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
