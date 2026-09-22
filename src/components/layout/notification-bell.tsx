"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/actions/workspace/workspace.actions";

interface NotificationItem {
  id: string;
  type: string;
  content: string;
  read: boolean;
  createdAt: Date;
  actor: { name: string } | null;
  entityType: string | null;
  entityId: string | null;
}

function buildEntityLink(role: string, entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  if (entityType === "LEAD") {
    return ["ADMIN", "SUPER_ADMIN"].includes(role)
      ? `/dashboard/admin/leads/${entityId}`
      : `/dashboard/sales/leads/${entityId}`;
  }
  if (entityType === "PROFILE") {
    if (["ADMIN", "SUPER_ADMIN"].includes(role)) return `/dashboard/admin/profiles/${entityId}`;
    if (role.startsWith("SERVICE")) return `/dashboard/service/profiles/${entityId}`;
    return `/dashboard/sales/profiles`;
  }
  return null;
}

export function NotificationBell({ role }: { role: string }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refreshCount = useCallback(async () => {
    const count = await getUnreadNotificationCount();
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 12000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  async function handleOpen(open: boolean) {
    if (open && !loaded) {
      const data = await getNotifications();
      setNotifications(data as NotificationItem[]);
      setLoaded(true);
    }
  }

  async function handleClickNotification(id: string) {
    await markNotificationReadAction(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    refreshCount();
  }

  async function handleMarkAllRead() {
    await markAllNotificationsReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  return (
    <DropdownMenu onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1.5 -top-1.5 h-4 min-w-4 justify-center rounded-full bg-red-600 px-1 text-[10px] text-white hover:bg-red-600">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="p-0 text-xs text-muted-foreground">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
        )}
        <div className="max-h-80 overflow-y-auto">
          {notifications.map((n) => (
            <DropdownMenuItem key={n.id} asChild>
              <Link
                href={buildEntityLink(role, n.entityType, n.entityId) ?? "/dashboard/workspace"}
                onClick={() => handleClickNotification(n.id)}
                className={`flex flex-col items-start gap-0.5 whitespace-normal ${!n.read ? "bg-primary/5" : ""}`}
              >
                <span className="text-sm">{n.content}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString("en-IN")}
                </span>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}