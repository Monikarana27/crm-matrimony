"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function LiveRefresh({
  generatedAt,
  intervalSec = 30,
}: {
  generatedAt: string;
  intervalSec?: number;
}) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => new Date(generatedAt).getTime());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (paused) return;
    const refresh = () => {
      if (document.visibilityState === "visible") startTransition(() => router.refresh());
    };
    const t = setInterval(refresh, intervalSec * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [paused, intervalSec, router]);

  const secs = Math.max(0, Math.round((now - new Date(generatedAt).getTime()) / 1000));

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
        {paused ? "Paused" : `Live, updated ${secs}s ago`}
      </span>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="rounded border px-2 py-0.5 hover:bg-muted"
      >
        {paused ? "Resume" : "Pause"}
      </button>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        className="rounded border px-2 py-0.5 hover:bg-muted"
      >
        Refresh now
      </button>
    </div>
  );
}
