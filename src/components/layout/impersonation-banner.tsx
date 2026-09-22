"use client";

import { endImpersonationAction } from "@/actions/auth/impersonation.actions";
import { useTransition } from "react";
import { UserCog } from "lucide-react";

export function ImpersonationBanner({ originalUserName }: { originalUserName: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm font-medium text-amber-900">
      <span className="flex items-center gap-2">
        <UserCog className="h-4 w-4" />
        Viewing as this employee - signed in as {originalUserName}
      </span>
      <button
        onClick={() => startTransition(() => endImpersonationAction())}
        disabled={isPending}
        className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50"
      >
        {isPending ? "Returning..." : "Return to Admin Account"}
      </button>
    </div>
  );
}
