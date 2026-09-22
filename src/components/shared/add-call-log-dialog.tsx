"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { addWelcomeCallLogAction } from "@/actions/welcome-calls/welcome-call-log.actions";
import { MessageSquarePlus } from "lucide-react";

type Status = "PENDING" | "COMPLETED" | "MISSED" | "RESCHEDULED";

export function AddCallLogDialog({
  welcomeCallId,
  clientName,
}: {
  welcomeCallId: string;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("PENDING");
  const [nextCallTime, setNextCallTime] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStatus("PENDING");
    setNextCallTime("");
    setNote("");
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addWelcomeCallLogAction(welcomeCallId, status, nextCallTime || null, note || null);
        setOpen(false);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
          title="Add Call Log Activity"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Call Log Activity</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{clientName}</div>
          </div>

          <div className="space-y-2">
            <Label>
              Status <span className="text-destructive">*</span>
            </Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="MISSED">Missed</SelectItem>
                <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Next Call Time</Label>
            <input
              type="datetime-local"
              value={nextCallTime}
              onChange={(e) => setNextCallTime(e.target.value)}
              className="h-10 w-full rounded-md border border-input px-3 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any internal notes"
              rows={3}
            />
          </div>

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
