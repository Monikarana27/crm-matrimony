"use client";

import { useState, useTransition } from "react";
import { uploadWelcomeCallAttachmentAction } from "@/actions/welcome-calls/welcome-call-log.actions";
import { Paperclip } from "lucide-react";

export function WelcomeCallAttachmentUpload({ welcomeCallId }: { welcomeCallId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || "Upload failed");
          return;
        }
        await uploadWelcomeCallAttachmentAction(welcomeCallId, data.url);
      } catch {
        setError("Something went wrong.");
      }
    });
  }

  return (
    <div className="inline-flex flex-col">
      <label
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
        title="Upload Attachment"
      >
        <Paperclip className="h-4 w-4" />
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={isPending} />
      </label>
      {error && <span className="mt-1 text-xs text-destructive">{error}</span>}
    </div>
  );
}
