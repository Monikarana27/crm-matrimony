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
import { X } from "lucide-react";

type Employee = { id: string; name: string };

interface ProfileAssignActionProps {
  profileId: string;
  currentAssignee: { id: string; name: string } | null;
  employees: Employee[];
}

export function ProfileAssignAction({
  profileId,
  currentAssignee,
  employees,
}: ProfileAssignActionProps) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(currentAssignee?.id ?? "");

  function handleAssign(employeeId: string) {
    setValue(employeeId);
    startTransition(() => {
      assignProfileAction(profileId, employeeId);
    });
  }

  function handleUnassign() {
    setValue("");
    startTransition(() => {
      unassignProfileAction(profileId);
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