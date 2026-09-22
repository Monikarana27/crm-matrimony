"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addProfileRemarkAction } from "@/actions/profiles/profile-remark.actions";
import { Pencil } from "lucide-react";

type Latest = { remark: string; createdAt: Date } | null | undefined;

export function InlineProfileRemarkEditor({ profileId, latest }: { profileId: string; latest: Latest }) {
  const [open, setOpen] = useState(false);
  const [remark, setRemark] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await addProfileRemarkAction(profileId, remark);
      setRemark("");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="block max-w-[200px] text-left group">
          {latest ? (
            <p className="truncate text-sm text-muted-foreground group-hover:underline">{latest.remark}</p>
          ) : (
            <span className="flex items-center gap-1 text-sm italic text-muted-foreground group-hover:underline">
              <Pencil className="h-3 w-3" /> Add remark
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Remark</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Remark..."
            rows={3}
            className="w-full rounded-md border border-input px-2 py-1.5 text-sm"
          />
          <Button className="w-full" disabled={isPending} onClick={submit}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}