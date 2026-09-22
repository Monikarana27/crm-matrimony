"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// Highlighted floating Back buttons at the vertical middle of both sides of the
// content area. Shown on inner pages only (/dashboard/<section>/<page>...).
// Goes back to the previous page; if there is none (new tab / bookmark), goes up one level.
export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 2) return null;

  const parent = "/" + segments.slice(0, -1).join("/");

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(parent);
    }
  }

  const style =
    "pointer-events-auto absolute flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/25 transition-transform hover:scale-110";

  return (
    <div className="pointer-events-none sticky top-1/2 z-40 h-0">
      <button type="button" onClick={goBack} title="Go back" aria-label="Go back" className={`${style} -left-6`}>
        <ArrowLeft className="h-5 w-5" />
      </button>
      <button type="button" onClick={goBack} title="Go back" aria-label="Go back" className={`${style} -right-6`}>
        <ArrowLeft className="h-5 w-5" />
      </button>
    </div>
  );
}
