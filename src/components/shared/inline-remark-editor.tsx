"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addLeadRemarkAction } from "@/actions/leads/lead-remark.actions";
import { Pencil } from "lucide-react";

const OUTCOMES = ["INTERESTED", "FOLLOW_UP", "NOT_INTERESTED", "DNP"];

const OUTCOME_STYLES: Record<string, string> = {
  INTERESTED: "text-green-700",
  FOLLOW_UP: "text-amber-700",
  NOT_INTERESTED: "text-red-700",
  DNP: "text-gray-500",
};

type Latest = { remark: string | null; outcome: string; createdAt: Date } | undefined;

export function InlineRemarkEditor({
  leadId,
  latest,
  legacyNotes,
}: {
  leadId: string;
  latest: Latest;
  legacyNotes?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState(latest?.outcome ?? "INTERESTED");
  const [remark, setRemark] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await addLeadRemarkAction(leadId, outcome as any, remark, null);
      setRemark("");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="block max-w-[200px] text-left group">
          {latest ? (
            <>
              <span className={`text-xs font-medium ${OUTCOME_STYLES[latest.outcome] ?? "text-muted-foreground"}`}>
                {latest.outcome.replace(/_/g, " ")}
              </span>
              <p className="truncate text-sm text-muted-foreground group-hover:underline">
                {latest.remark || "Add a note..."}
              </p>
            </>
          ) : legacyNotes ? (
            <>
              <span className="text-xs font-medium text-muted-foreground">Website note</span>
              <p className="truncate text-sm text-muted-foreground group-hover:underline">
                {legacyNotes}
              </p>
            </>
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
          {!latest && legacyNotes && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <span className="block text-xs font-medium mb-1">Website note (not editable here)</span>
              {legacyNotes}
            </div>
          )}
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OUTCOMES.map((o) => (
                <SelectItem key={o} value={o}>{o.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
