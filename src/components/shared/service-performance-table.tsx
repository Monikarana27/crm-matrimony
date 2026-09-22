import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DailyRow = {
  employeeId: string;
  employeeName: string;
  profilesShared: number;
  welcomeCalls: number;
  meetingsScheduled: number;
  meetingsCompleted: number;
  shortlists: number;
};

type MonthlyRow = {
  employeeId: string;
  employeeName: string;
  profilesShared: number;
  welcomeCalls: number;
  meetingsConducted: number;
  shortlists: number;
  engagementCases: number;
  marriageClosures: number;
};

export function ServicePerformanceTable({
  title,
  subtitle,
  rows,
  variant,
}: {
  title: string;
  subtitle: string;
  rows: DailyRow[] | MonthlyRow[];
  variant: "daily" | "monthly";
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
              <th className="py-2 pr-3 font-medium text-right">Profiles Shared</th>
              <th className="py-2 pr-3 font-medium text-right">Welcome Calls</th>
              {variant === "daily" ? (
                <>
                  <th className="py-2 pr-3 font-medium text-right">Meetings Scheduled</th>
                  <th className="py-2 pr-3 font-medium text-right">Meetings Completed</th>
                </>
              ) : (
                <th className="py-2 pr-3 font-medium text-right">Meetings Conducted</th>
              )}
              <th className="py-2 pr-3 font-medium text-right">Shortlists</th>
              {variant === "monthly" && (
                <>
                  <th className="py-2 pr-3 font-medium text-right">Engagements</th>
                  <th className="py-2 pl-3 font-medium text-right">Marriages</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employeeId} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium">{row.employeeName}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{row.profilesShared}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{row.welcomeCalls}</td>
                {variant === "daily" ? (
                  <>
                    <td className="py-2 pr-3 text-right tabular-nums">{(row as DailyRow).meetingsScheduled}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{(row as DailyRow).meetingsCompleted}</td>
                  </>
                ) : (
                  <td className="py-2 pr-3 text-right tabular-nums">{(row as MonthlyRow).meetingsConducted}</td>
                )}
                <td className="py-2 pr-3 text-right tabular-nums">{row.shortlists}</td>
                {variant === "monthly" && (
                  <>
                    <td className="py-2 pr-3 text-right tabular-nums">{(row as MonthlyRow).engagementCases}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{(row as MonthlyRow).marriageClosures}</td>
                  </>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={variant === "daily" ? 6 : 7} className="py-6 text-center text-muted-foreground">
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