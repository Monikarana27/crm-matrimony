import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ConversionRateCard({
  rate,
  month,
  todaysActivityCount,
}: {
  rate: number;
  month: string;
  todaysActivityCount: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Sales Performance</CardTitle>
        <p className="text-xs text-muted-foreground">{month}</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-1 py-4">
        <span className="font-display text-4xl font-bold text-primary tabular-nums">
          {rate.toFixed(1)}%
        </span>
        <span className="text-sm text-muted-foreground">Lead Conversion Rate</span>

        <div className="mt-6 w-full rounded-lg bg-muted/50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Today&apos;s Activities</span>
            <span className="font-semibold tabular-nums">{todaysActivityCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}