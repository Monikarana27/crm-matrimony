"use client";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardTabs({
  tabs,
}: {
  tabs: { label: string; content: ReactNode; badge?: number }[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-6">
      <div className="inline-flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-muted/50 p-1.5">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={cn(
              "relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-all",
              active === i
                ? "bg-background font-semibold text-foreground shadow-sm ring-1 ring-border"
                : "font-medium text-muted-foreground hover:bg-background/60 hover:text-foreground"
            )}
          >
            {tab.label}
            {!!tab.badge && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white shadow-sm">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div key={tab.label} className={active === i ? "block" : "hidden"}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
