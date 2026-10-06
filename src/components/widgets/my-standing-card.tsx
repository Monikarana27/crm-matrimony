import { Card, CardContent } from "@/components/ui/card";
import { Flame, Medal, Sparkles, Trophy } from "lucide-react";
import { getMyStanding, type PeriodStanding } from "@/lib/stats/my-standing";

function Period({ label, p }: { label: string; p: PeriodStanding }) {
  const isBottom = p.rank !== null && p.of !== null && p.rank > 1 && p.rank === p.of;
  let place: string | null = null;
  if (p.rank === 1) place = "You're in front";
  else if (p.rank !== null && !isBottom) place = `#${p.rank} of ${p.of}`;
  const climb = p.toNext !== null ? `${p.toNext} pts to move up` : null;

  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">
        {p.points}
        <span className="ml-1 text-sm font-normal text-muted-foreground">pts</span>
      </p>
      {place && <p className="text-sm font-medium">{place}</p>}
      {climb && <p className="text-xs text-muted-foreground">{climb}</p>}
    </div>
  );
}

export async function MyStandingCard({ userId }: { userId: string }) {
  let s: Awaited<ReturnType<typeof getMyStanding>> = null;
  try {
    s = await getMyStanding(userId);
  } catch {
    return null;
  }
  if (!s) return null;

  const badges: { key: string; label: string; icon: React.ElementType }[] = [];
  if (s.badges.topToday) badges.push({ key: "top-today", label: "Top performer today", icon: Trophy });
  if (s.badges.top3Week) badges.push({ key: "top3", label: "Top 3 this week", icon: Medal });
  if (s.badges.personalBest) badges.push({ key: "best", label: "New personal best", icon: Sparkles });
  if (s.streak >= 3) badges.push({ key: "streak", label: `${s.streak}-day streak`, icon: Flame });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">My Standing</h3>
          <div className="flex flex-wrap gap-2">
            {badges.map(({ key, label, icon: Icon }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Period label="Today" p={s.today} />
          <Period label="This week" p={s.week} />
          <Period label="This month" p={s.month} />
        </div>
        <p className="text-xs text-muted-foreground">
          Compared within the {s.poolLabel}. Only your own numbers are shown here.
        </p>
      </CardContent>
    </Card>
  );
}
