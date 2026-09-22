"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendProfileEmailAction } from "@/actions/profiles/email-profile.action";
import { Mail } from "lucide-react";

export function EmailProfileButton({ profileId, defaultEmail }: { profileId: string; defaultEmail: string | null }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Mail className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="client@email.com"
        className="h-8 w-40 text-xs"
      />
      <Button
        size="sm"
        disabled={isPending || !email}
        onClick={() =>
          startTransition(async () => {
            await sendProfileEmailAction(profileId, email);
            setSent(true);
          })
        }
      >
        {isPending ? "Sending..." : sent ? "Sent ✓" : "Send"}
      </Button>
    </div>
  );
}