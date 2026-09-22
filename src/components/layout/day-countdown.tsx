"use client";

import { useEffect, useState } from "react";

const MANDATORY_MS = 8.5 * 60 * 60 * 1000;

function formatRemaining(ms: number) {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function DayCountdown({
  checkIn,
  breakStart,
  breakEnd,
}: {
  checkIn: Date | string;
  breakStart?: Date | string | null;
  breakEnd?: Date | string | null;
}) {
  const checkInMs = new Date(checkIn).getTime();
  // breakStart/breakEnd are accepted for API compatibility but no longer
  // subtracted here: the 8.5h target covers total time since check-in,
  // including any break, per policy (break does not extend the day).
  void breakStart;
  void breakEnd;

  function computeRemaining() {
    const now = Date.now();
    const elapsedMs = now - checkInMs;
    return MANDATORY_MS - elapsedMs;
  }

  const [remaining, setRemaining] = useState(computeRemaining);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(computeRemaining());
    }, 1000);
    return () => clearInterval(id);
  }, [checkInMs]);

  const isOvertime = remaining <= 0;

  return (
    <span
      className={
        isOvertime
          ? "font-mono text-xs text-slate-500"
          : "font-mono text-xs text-emerald-700"
      }
    >
      {isOvertime ? "+" : "-"}
      {formatRemaining(remaining)}
    </span>
  );
}
