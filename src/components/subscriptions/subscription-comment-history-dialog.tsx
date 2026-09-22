"use client";

import { useEffect, useState, useTransition } from "react";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSubscriptionComments } from "@/actions/subscriptions/subscription-comment.actions";

type CommentEntry = {
  id: string;
  remark: string;
  createdAt: Date;
  actor: { name: string };
};

export function SubscriptionCommentHistoryDialog({
  subscriptionId,
  profileName,
  open,
  onOpenChange,
}: {
  subscriptionId: string;
  profileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [comments, setComments] = useState<CommentEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load fresh comments every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    startTransition(async () => {
      try {
        const data = await getSubscriptionComments(subscriptionId);
        setComments(data as CommentEntry[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load comments.");
      }
    });
  }, [open, subscriptionId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Comment History — {profileName}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {isPending && <p className="text-sm text-muted-foreground">Loading...</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {!isPending && comments !== null && comments.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}

          {!isPending &&
            comments?.map((entry) => (
              <div key={entry.id} className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="whitespace-pre-wrap text-sm">{entry.remark}</p>
                <div className="mt-1.5 text-xs text-muted-foreground">
                  {entry.actor.name} ·{" "}
                  {new Date(entry.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
