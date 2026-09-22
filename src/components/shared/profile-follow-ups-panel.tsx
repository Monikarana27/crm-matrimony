"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addProfileRemarkAction, getProfileRemarks } from "@/actions/profiles/profile-remark.actions";
import { MessageSquareText } from "lucide-react";

type Remark = {
  id: string;
  remark: string;
  createdAt: Date;
  actor: { name: string };
};

export function ProfileFollowUpsPanel({ profileId }: { profileId: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submitComment() {
    if (!comment.trim()) return;
    startTransition(async () => {
      await addProfileRemarkAction(profileId, comment);
      setComment("");
      setAddOpen(false);
    });
  }

  function openHistory() {
    setHistoryOpen(true);
    setIsLoadingHistory(true);
    getProfileRemarks(profileId)
      .then((data) => setRemarks(data as Remark[]))
      .finally(() => setIsLoadingHistory(false));
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={openHistory}>
        <MessageSquareText className="mr-2 h-4 w-4" />
        Follow-ups
      </Button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <Button size="sm">Add Comment</Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Follow-up Comment (All Shares)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter comment..."
              rows={4}
              className="w-full rounded-md border border-input px-2 py-1.5 text-sm"
            />
            <Button className="w-full" disabled={isPending || !comment.trim()} onClick={submitComment}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Follow-ups</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {isLoadingHistory && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!isLoadingHistory && remarks.length === 0 && (
              <p className="text-sm text-muted-foreground">No follow-up comments yet.</p>
            )}
            {!isLoadingHistory &&
              remarks.map((r) => (
                <div key={r.id} className="border-b pb-2 last:border-0">
                  <p className="text-sm">{r.remark}</p>
                  <p className="text-xs text-muted-foreground">
                    Commented by <span className="font-medium">{r.actor.name}</span> (
                    {new Date(r.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    )
                  </p>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
