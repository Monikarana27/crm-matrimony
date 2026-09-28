"use client";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PPApprovalSwitcher({
  pendingCount,
  validatedCount,
  pending,
  validated,
}: {
  pendingCount: number;
  validatedCount: number;
  pending: ReactNode;
  validated: ReactNode;
}) {
  const [view, setView] = useState<"pending" | "validated">("pending");

  const pill = (active: boolean) =>
    cn(
      "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
    );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className={pill(view === "pending")} onClick={() => setView("pending")}>
          Pending ({pendingCount})
        </button>
        <button className={pill(view === "validated")} onClick={() => setView("validated")}>
          Validated ({validatedCount})
        </button>
      </div>
      <div className={view === "pending" ? "block" : "hidden"}>{pending}</div>
      <div className={view === "validated" ? "block" : "hidden"}>{validated}</div>
    </div>
  );
}
