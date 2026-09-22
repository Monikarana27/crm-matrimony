"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { startImpersonationAction } from "@/actions/auth/impersonation.actions";

export function ViewAsButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => startImpersonationAction(userId))}
    >
      <Eye className="mr-1.5 h-3.5 w-3.5" />
      {isPending ? "Loading..." : "View As"}
    </Button>
  );
}