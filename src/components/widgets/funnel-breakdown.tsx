import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FunnelRow {
  label: string;
  value: number;
  total: number;
  colorClass: string;
  barColorClass: string;
}

export function FunnelBreakdown({
  title,
  subtitle,
  rows,
  badge,
}: {
  title: string;
  subtitle?: string;
  rows: FunnelRow[];
  badge?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {badge && (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
            {badge}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const pct = row.total > 0 ? (row.value / row.total) * 100 : 0;
          return (
            <div
              key={row.label}
              className={cn("rounded-lg border-l-4 p-3", row.colorClass)}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{row.label}</span>
                <span className="tabular-nums">
                  <span className="font-semibold">{row.value}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    ({pct.toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                <div
                  className={cn("h-full rounded-full", row.barColorClass)}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
