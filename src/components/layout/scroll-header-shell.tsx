"use client";

import { useEffect, useState } from "react";

export function ScrollHeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b px-6 backdrop-blur transition-colors duration-300 ${
        scrolled
          ? "border-primary/20 bg-gradient-to-r from-primary/10 via-primary/10 to-[oklch(0.271_0.105_12.094/0.10)]"
          : "border-border/60 bg-background/80"
      }`}
    >
      {children}
    </header>
  );
}
