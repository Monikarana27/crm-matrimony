"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_CONFIG, EXTRA_ACCESS_NAV_ITEMS, type NavItem } from "@/config/navigation";
import type { Role } from "@/lib/permissions/roles";

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administration",
  SALES: "Sales Workspace",
  SALES_TL: "Sales Team Lead",
  SALES_MANAGER: "Sales Manager",
  PROFILE_CREATOR: "Profile Creator",
  SERVICE: "Service Workspace",
  SERVICE_TL: "Service Team Lead",
  SERVICE_MANAGER: "Service Manager",
  HR: "Human Resources",
  SYSTEM: "System",
};

const COLLAPSE_STORAGE_KEY = "sidebar-collapsed";

function groupBySection(items: NavItem[]): { section: string; items: NavItem[] }[] {
  const groups: { section: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.section === item.section) {
      last.items.push(item);
    } else {
      groups.push({ section: item.section, items: [item] });
    }
  }
  return groups;
}

export function Sidebar({
  role,
  extraModules = [],
  userName,
}: {
  role: Role;
  extraModules?: string[];
  userName?: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }

  const baseItems = NAV_CONFIG[role];
  const existingHrefs = new Set(baseItems.map((i) => i.href));
  const extraItems: NavItem[] = EXTRA_ACCESS_NAV_ITEMS.filter(
    (entry) => extraModules.includes(entry.module) && !existingHrefs.has(entry.item.href)
  ).map((entry) => entry.item);
  const items = [...baseItems, ...extraItems];
  const groups = groupBySection(items);
  const initials = (userName ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col self-start border-r border-sidebar-border bg-sidebar transition-all duration-200 md:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-6">
        {!collapsed && (
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            {ROLE_LABEL[role]}
          </p>
        )}
        <button
          onClick={toggleCollapsed}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
        {groups.map((group, gi) => (
          <div key={`${group.section}-${gi}`} className="flex flex-col gap-0.5">
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.section}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    collapsed && "justify-center px-0",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary" />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-sidebar-primary"
                        : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                    )}
                  />
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {userName && (
        <div className="border-t border-sidebar-border px-4 py-3">
          {!collapsed && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Logged in as
            </p>
          )}
          <div className={cn("mt-1.5 flex items-center gap-2.5", collapsed && "mt-0 justify-center")}>
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground"
              title={collapsed ? userName : undefined}
            >
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">{userName}</p>
                <p className="truncate text-xs text-sidebar-foreground/55">{ROLE_LABEL[role]}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
