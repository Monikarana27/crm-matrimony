"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  assignProfileAction,
  unassignProfileAction,
} from "@/actions/profiles/profile.actions";
import {
  assignLeadAction,
  unassignLeadAction,
} from "@/actions/leads/lead.actions";
import { X } from "lucide-react";

type Employee = { id: string; name: string };

interface UnifiedAssignActionProps {
  // Pass whichever id applies — profileId for PROFILE rows, leadId for LEAD/QUEUE rows.
  targetId: string;
  targetType: "PROFILE" | "LEAD";
  currentAssignee: { id: string; name: string } | null;
  employees: Employee[];
}

export function UnifiedAssignAction({
  targetId,
  targetType,
  currentAssignee,
  employees,
}: UnifiedAssignActionProps) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(currentAssignee?.id ?? "");

  function handleAssign(employeeId: string) {
    setValue(employeeId);
    startTransition(() => {
      if (targetType === "PROFILE") {
        assignProfileAction(targetId, employeeId);
      } else {
        assignLeadAction(targetId, employeeId);
      }
    });
  }

  function handleUnassign() {
    setValue("");
    startTransition(() => {
      if (targetType === "PROFILE") {
        unassignProfileAction(targetId);
      } else {
        unassignLeadAction(targetId);
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select value={value} onValueChange={handleAssign} disabled={isPending}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          {employees.map((emp) => (
            <SelectItem key={emp.id} value={emp.id}>
              {emp.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          disabled={isPending}
          onClick={handleUnassign}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}