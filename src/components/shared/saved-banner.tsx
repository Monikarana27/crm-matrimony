"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

export function SavedBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("saved") === "true") {
      setVisible(true);
      // strip the query param so a refresh doesn't re-show it
      router.replace(pathname);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, pathname, router]);

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="font-medium">Profile saved successfully</span>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-emerald-700/70 hover:text-emerald-900"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
