import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function KpiTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClasses = {
    default: "text-foreground",
    warning: "text-amber-600",
    danger: "text-red-600",
    success: "text-emerald-600",
  };

  return (
    <Card className="flex flex-row items-center gap-3 p-4">
      {Icon && (
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted", toneClasses[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      )}
      <div className="min-w-0">
        <p className={cn("text-xl font-bold tabular-nums leading-tight", toneClasses[tone])}>{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}