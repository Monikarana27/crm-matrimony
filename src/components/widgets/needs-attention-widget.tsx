import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type AttentionItem = {
  label: string;
  count: number;
  href: string;
  tone?: "warning" | "danger";
};

export function NeedsAttentionWidget({ items }: { items: AttentionItem[] }) {
  const active = items.filter((i) => i.count > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <CardTitle className="text-sm font-semibold">Needs Attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {active.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">All clear — nothing needs attention.</p>
        ) : (
          active.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
            >
              <span>{item.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  item.tone === "danger"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                {item.count}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}