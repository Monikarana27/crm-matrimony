"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { addLeadRemarkAction } from "@/actions/leads/lead-remark.actions";

const OUTCOMES = ["INTERESTED", "FOLLOW_UP", "NOT_INTERESTED", "DNP"];

export function LeadRemarkForm({ leadId, currentFollowUpDate }: { leadId: string; currentFollowUpDate?: Date | null }) {
  const [outcome, setOutcome] = useState("INTERESTED");
  const [remark, setRemark] = useState("");
  const [followUpDate, setFollowUpDate] = useState(
    currentFollowUpDate ? new Date(currentFollowUpDate).toISOString().slice(0, 10) : ""
  );
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div className="w-48 space-y-1">
        <label className="text-xs text-muted-foreground">Call Outcome</label>
        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="w-44 space-y-1">
        <label className="text-xs text-muted-foreground">Follow-up Date</label>
        <input
          type="date"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
          className="h-10 w-full rounded-md border border-input px-3 text-sm"
        />
      </div>
      <input
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        placeholder="Comment..."
        className="h-10 flex-1 rounded-md border border-input px-3 text-sm"
      />
      <Button
        disabled={isPending}
        onClick={() => startTransition(async () => {
          await addLeadRemarkAction(leadId, outcome as any, remark, followUpDate || null);
          setRemark("");
        })}
      >
        {isPending ? "Saving..." : "Add Comment"}
      </Button>
    </div>
  );
}
