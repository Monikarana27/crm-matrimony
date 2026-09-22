"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Coffee } from "lucide-react";
import { endBreakAction } from "@/actions/attendance/attendance.actions";

export function OnBreakScreen({ breakStart }: { breakStart: Date }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const since = new Date(breakStart).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleEndBreak() {
    startTransition(async () => {
      const result = await endBreakAction();
      if (result?.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <Coffee className="h-8 w-8" />
      </div>
      <h1 className="text-xl font-semibold">You're on your lunch break</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        On break since {since}. The CRM is locked until you end your break.
      </p>
      <Button onClick={handleEndBreak} disabled={isPending}>
        {isPending ? "Ending break..." : "End Break"}
      </Button>
    </div>
  );
}
