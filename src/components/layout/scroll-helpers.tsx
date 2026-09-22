"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

// Things that must keep their normal click/drag behaviour inside a table.
const INTERACTIVE =
  "a,button,input,select,textarea,label,summary,[role='button'],[role='menuitem'],[role='checkbox'],[data-no-drag]";

export function ScrollHelpers() {
  const [showTop, setShowTop] = useState(false);

  // Floating "back to top" after scrolling down a page.
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Click-and-drag to scroll any table, horizontally and vertically.
  useEffect(() => {
    let box: HTMLElement | null = null;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const onDown = (e: MouseEvent) => {
      dragging = false;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest(INTERACTIVE)) return;
      const el = target.closest("main .overflow-auto, main .overflow-x-auto") as HTMLElement | null;
      if (!el || !el.querySelector("table")) return;
      if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return;
      box = el;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = el.scrollLeft;
      startTop = el.scrollTop;
    };

    const onMove = (e: MouseEvent) => {
      if (!box) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(dx) + Math.abs(dy) < 6) return;
        dragging = true;
        box.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }
      box.scrollLeft = startLeft - dx;
      box.scrollTop = startTop - dy;
    };

    const onUp = () => {
      if (box) box.style.cursor = "";
      document.body.style.userSelect = "";
      box = null;
    };

    // Swallow the click that ends a drag so rows/links aren't triggered.
    const onClick = (e: MouseEvent) => {
      if (dragging) {
        e.preventDefault();
        e.stopPropagation();
        dragging = false;
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  if (!showTop) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      title="Back to top"
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
