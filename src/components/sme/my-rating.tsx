import { getMyRating } from "@/lib/stats/sme-client-reviews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export async function MyRating() {
  const r = await getMyRating();
  if (!r) return null;

  const tone = r.avg >= 4 ? "text-emerald-600" : r.avg >= 3 ? "text-amber-600" : "text-red-600";

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Your client rating</CardTitle>
        <p className="text-xs text-muted-foreground">
          From your SME's feedback calls with your ongoing clients.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className={`text-3xl font-semibold ${tone}`}>{r.avg.toFixed(1)} ★</span>
          <span className="text-sm text-muted-foreground">
            {r.reviewed} of {r.total} ongoing clients reviewed
          </span>
        </div>
        {r.lowRated.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Needs your attention</p>
            {r.lowRated.map((l) => (
              <div key={l.profileCode} className="rounded-md border border-red-200 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {l.clientName} · {l.profileCode}
                  </span>
                  <span className="text-red-600">{stars(l.rating)}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(l.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "Asia/Kolkata",
                    })}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap">{l.feedback}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
