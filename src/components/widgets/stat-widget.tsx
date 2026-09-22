import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatLine {
  label: string;
  value: string | number;
}

type AccentColor = "blue" | "cyan" | "emerald" | "amber" | "violet" | "rose";

interface StatWidgetProps {
  title: string;
  icon?: LucideIcon;
  accentColor?: AccentColor;
  badge?: { text: string; className?: string };
  lines: StatLine[];
  caption?: string;
  progress?: { value: number; colorClass?: string };
  actionLabel?: string;
  actionHref?: string;
}

const ACCENT_CLASSES: Record<AccentColor, { chip: string; icon: string }> = {
  blue: { chip: "bg-blue-50", icon: "text-blue-600" },
  cyan: { chip: "bg-cyan-50", icon: "text-cyan-600" },
  emerald: { chip: "bg-emerald-50", icon: "text-emerald-600" },
  amber: { chip: "bg-amber-50", icon: "text-amber-600" },
  violet: { chip: "bg-violet-50", icon: "text-violet-600" },
  rose: { chip: "bg-rose-50", icon: "text-rose-600" },
};

function isZero(value: string | number) {
  return value === 0 || value === "0";
}

export function StatWidget({
  title,
  icon: Icon,
  accentColor = "blue",
  badge,
  lines,
  caption,
  progress,
  actionLabel,
  actionHref,
}: StatWidgetProps) {
  const allZero = lines.length > 0 && lines.every((line) => isZero(line.value));
  const accent = ACCENT_CLASSES[accentColor];

  return (
    <Card className="flex flex-col border border-border/80 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", accent.chip)}>
              <Icon className={cn("h-4 w-4", accent.icon)} />
            </span>
          )}
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </div>
        {badge && (
          <Badge variant="outline" className={badge.className}>
            {badge.text}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-1">
        {allZero ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-4 text-center">
            {Icon ? (
              <Icon className={cn("h-6 w-6 opacity-30", accent.icon)} />
            ) : (
              <div className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/30" />
            )}
            <p className="text-xs text-muted-foreground/60">No data yet</p>
          </div>
        ) : lines.length === 1 ? (
          <div>
            <p className="font-display text-3xl font-bold tabular-nums">{lines[0].value}</p>
            <p className="text-xs text-muted-foreground">{lines[0].label}</p>
            {caption && <p className="mt-0.5 text-xs text-muted-foreground/70">{caption}</p>}
          </div>
        ) : lines.length === 2 ? (
          <div className="grid grid-cols-2 gap-3">
            {lines.map((line) => (
              <div key={line.label}>
                <p
                  className={cn(
                    "font-display text-2xl font-bold tabular-nums",
                    isZero(line.value) && "text-muted-foreground/40"
                  )}
                >
                  {line.value}
                </p>
                <p className="text-xs text-muted-foreground">{line.label}</p>
              </div>
            ))}
          </div>
        ) : (
          lines.map((line, i) => (
            <div
              key={line.label}
              className={cn(
                "flex items-center justify-between py-1 text-sm",
                i !== lines.length - 1 && "border-b border-dashed border-border/50"
              )}
            >
              <span className="text-muted-foreground">{line.label}</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  isZero(line.value) && "font-normal text-muted-foreground/50"
                )}
              >
                {line.value}
              </span>
            </div>
          ))
        )}
        {progress && (
          progress.value > 0 ? (
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", progress.colorClass ?? "bg-primary")}
                style={{ width: `${Math.min(progress.value, 100)}%` }}
              />
            </div>
          ) : (
            <div className="mt-1 h-2 w-full rounded-full border border-dashed border-muted-foreground/25" />
          )
        )}
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="mt-auto pt-1 text-sm font-medium text-primary hover:underline"
          >
            {actionLabel}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
