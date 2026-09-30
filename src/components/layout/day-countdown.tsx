"use client";

import { useEffect, useState } from "react";
import { computeExpectedLeaveMs } from "@/lib/attendance/expected-leave";

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
  const breakStartMs = breakStart ? new Date(breakStart).getTime() : null;
  const breakEndMs = breakEnd ? new Date(breakEnd).getTime() : null;

  function compute() {
    const now = Date.now();
    const leaveMs = computeExpectedLeaveMs(checkInMs, breakStartMs, breakEndMs, now);
    return { leaveMs, remaining: leaveMs - now };
  }

  const [state, setState] = useState(compute);

  useEffect(() => {
    setState(compute());
    const id = setInterval(() => setState(compute()), 1000);
    return () => clearInterval(id);
  }, [checkInMs, breakStartMs, breakEndMs]);

  const isOvertime = state.remaining <= 0;
  const leaveLabel = new Date(state.leaveMs).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Leave by {leaveLabel}</span>
      <span
        className={
          isOvertime
            ? "font-mono text-xs text-slate-500"
            : "font-mono text-xs text-emerald-700"
        }
      >
        {isOvertime ? "+" : "-"}
        {formatRemaining(state.remaining)}
      </span>
    </span>
  );
}
