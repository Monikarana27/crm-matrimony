import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "good" | "warn" | "bad" | "info" | "muted";

const FILL: Record<Tone, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-400",
  bad: "bg-rose-500",
  info: "bg-sky-500",
  muted: "bg-slate-400",
};
const TEXT: Record<Tone, string> = {
  good: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-rose-700",
  info: "text-sky-700",
  muted: "text-foreground",
};
const BOX: Record<Tone, string> = {
  good: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
  warn: "border-amber-200 bg-amber-50/70 text-amber-900",
  bad: "border-rose-200 bg-rose-50/70 text-rose-900",
  info: "border-sky-200 bg-sky-50/70 text-sky-900",
  muted: "border-border bg-muted/40 text-foreground",
};

export function Section({ title, why, children }: { title: string; why?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border/80 bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      {why ? <p className="mb-4 mt-0.5 text-xs text-muted-foreground">{why}</p> : <div className="mb-4" />}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone = "muted" }: { label: string; value: string; sub?: string; tone?: Tone }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-3xl font-semibold tabular-nums tracking-tight", TEXT[tone])}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Insight({ tone, title, children }: { tone: Tone; title: string; children?: ReactNode }) {
  return (
    <div className={cn("rounded-lg border p-3 text-sm", BOX[tone])}>
      <p className="font-medium">{title}</p>
      {children && <p className="mt-0.5 text-xs opacity-90">{children}</p>}
    </div>
  );
}

export function Badge({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", BOX[tone])}>{children}</span>;
}

export type HRow = { label: string; value: number; text?: string; sub?: string; tone?: Tone };
export function HBars({ rows, max }: { rows: HRow[]; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-muted-foreground">Nothing to show yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 tabular-nums">
              {r.text ?? r.value}
              {r.sub && <span className="ml-2 text-xs text-muted-foreground">{r.sub}</span>}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted">
            <div
              className={cn("h-2 rounded-full", FILL[r.tone ?? "info"])}
              style={{ width: `${r.value > 0 ? Math.max((r.value / top) * 100, 2) : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export type VBar = { label: string; value: number; tip?: string };
export function VBars({
  bars,
  labelEvery = 1,
  showValues = false,
  suffix = "",
}: {
  bars: VBar[];
  labelEvery?: number;
  showValues?: boolean;
  suffix?: string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div>
      <div className="flex h-36 items-end gap-1">
        {bars.map((b, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end" title={b.tip ?? `${b.label}: ${b.value}${suffix}`}>
            {showValues && b.value > 0 && (
              <span className="mb-0.5 text-center text-[10px] tabular-nums text-muted-foreground">
                {b.value}
                {suffix}
              </span>
            )}
            <div
              className={cn("w-full rounded-t", b.value > 0 ? "bg-primary/80" : "bg-muted")}
              style={{ height: b.value > 0 ? `${Math.max((b.value / max) * 100, 4)}%` : "2px" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground">
            {i % labelEvery === 0 ? b.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const first = Math.max(1, steps[0]?.value ?? 1);
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const prev = i === 0 ? s.value : steps[i - 1]?.value ?? 0;
        const drop = prev > 0 ? Math.round(((prev - s.value) / prev) * 100) : 0;
        return (
          <div key={i}>
            <div className="flex items-baseline justify-between text-sm">
              <span>{s.label}</span>
              <span className="tabular-nums">
                {s.value.toLocaleString("en-IN")}
                <span className="ml-2 text-xs text-muted-foreground">
                  {Math.round((s.value / first) * 100)}% of all{i > 0 && drop > 0 ? `, lost ${drop}% from previous step` : ""}
                </span>
              </span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-muted">
              <div className="h-3 rounded-full bg-primary/80" style={{ width: `${Math.max((s.value / first) * 100, 1)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Table({
  cols,
  rows,
  empty = "No data yet.",
}: {
  cols: { h: string; right?: boolean }[];
  rows: ReactNode[][];
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {cols.map((c, i) => (
              <th key={i} className={cn("px-3 py-2 font-medium first:pl-0", c.right && "text-right")}>
                {c.h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="py-4 text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-dashed last:border-0">
              {r.map((c, j) => (
                <td key={j} className={cn("px-3 py-2 first:pl-0", cols[j]?.right && "text-right tabular-nums")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pill({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
      )}
    >
      {children}
    </Link>
  );
}
