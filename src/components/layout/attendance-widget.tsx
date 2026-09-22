"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DayCountdown } from "@/components/layout/day-countdown";
import {
  selfCheckInAction,
  startBreakAction,
  endBreakAction,
  selfCheckOutAction,
} from "@/actions/attendance/attendance.actions";
type Attendance = {
  checkIn: Date | null;
  checkOut: Date | null;
  breakStart: Date | null;
  breakEnd: Date | null;
} | null;
function fmt(d: Date | string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
export function AttendanceWidget({ attendance }: { attendance: Attendance }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  function run(action: () => Promise<{ error: string | null }>) {
    startTransition(async () => {
      const res = await action();
      if (res.error) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }
  const onBreak = !!attendance?.breakStart && !attendance?.breakEnd;
  if (attendance?.checkOut) {
    return (
      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
        Day complete · {fmt(attendance.checkOut)}
      </Badge>
    );
  }
  if (onBreak) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
          On break since {fmt(attendance!.breakStart!)}
        </Badge>
        <DayCountdown checkIn={attendance!.checkIn!} breakStart={attendance!.breakStart} breakEnd={attendance!.breakEnd} />
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(endBreakAction)}>
          End Break
        </Button>
      </div>
    );
  }
  if (attendance?.checkIn) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
          Working since {fmt(attendance.checkIn)}
        </Badge>
        <DayCountdown checkIn={attendance.checkIn} breakStart={attendance.breakStart} breakEnd={attendance.breakEnd} />
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(startBreakAction)}>
          Start Break
        </Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(selfCheckOutAction)}>
          End Day
        </Button>
      </div>
    );
  }
  return (
    <Button size="sm" disabled={isPending} onClick={() => run(selfCheckInAction)}>
      Start Day
    </Button>
  );
}
