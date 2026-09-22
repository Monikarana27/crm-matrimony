import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Row = {
  employeeId: string;
  employeeName: string;
  leadsAssigned: number;
  callsMade: number;
  meetingsScheduled: number;
  conversions: number;
  conversionPct?: number;
  revenue: number;
};

export function SalesPerformanceTable({
  title,
  subtitle,
  rows,
  showConversionPct = false,
}: {
  title: string;
  subtitle: string;
  rows: Row[];
  showConversionPct?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto pt-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Employee</th>
              <th className="py-2 pr-3 font-medium text-right">Leads</th>
              <th className="py-2 pr-3 font-medium text-right">Calls</th>
              <th className="py-2 pr-3 font-medium text-right">Meetings</th>
              <th className="py-2 pr-3 font-medium text-right">Conversions</th>
              {showConversionPct && <th className="py-2 pr-3 font-medium text-right">Conv %</th>}
              <th className="py-2 pl-3 font-medium text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employeeId} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium">{row.employeeName}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{row.leadsAssigned}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{row.callsMade}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{row.meetingsScheduled}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {row.conversions}
                  </Badge>
                </td>
                {showConversionPct && (
                  <td className="py-2 pr-3 text-right tabular-nums">{row.conversionPct?.toFixed(1)}%</td>
                )}
                <td className="py-2 pl-3 text-right font-medium tabular-nums">
                  ₹{row.revenue.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={showConversionPct ? 7 : 6} className="py-6 text-center text-muted-foreground">
                  No data yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}