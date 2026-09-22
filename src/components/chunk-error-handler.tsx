"use client";

import { useEffect } from "react";

export function ChunkErrorHandler() {
  useEffect(() => {
    const isChunkError = (message: string) =>
      /Loading chunk [\d]+ failed/i.test(message) ||
      /ChunkLoadError/i.test(message) ||
      /Failed to fetch dynamically imported module/i.test(message);

    const reloadOnce = () => {
      const key = "chunk-reload-done";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    };

    const onError = (event: ErrorEvent) => {
      if (isChunkError(event.message)) reloadOnce();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || String(event.reason);
      if (isChunkError(msg)) reloadOnce();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
