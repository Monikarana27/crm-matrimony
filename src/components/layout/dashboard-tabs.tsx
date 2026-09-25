"use client";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardTabs({
  tabs,
}: {
  tabs: { label: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border bg-muted/40 p-1">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              active === i
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
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
