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
import { X } from "lucide-react";
import { toast } from "sonner";

type Employee = { id: string; name: string };

interface AssignActionProps {
  entityId: string;
  currentAssignee: { id: string; name: string } | null;
  employees: Employee[];
  onAssign: (entityId: string, employeeId: string) => void | Promise<void>;
  onUnassign: (entityId: string) => void | Promise<void>;
}

export function AssignAction({
  entityId,
  currentAssignee,
  employees,
  onAssign,
  onUnassign,
}: AssignActionProps) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(currentAssignee?.id ?? "");

  function handleAssign(employeeId: string) {
    setValue(employeeId);
    const employeeName = employees.find((e) => e.id === employeeId)?.name ?? "employee";
    startTransition(async () => {
      await onAssign(entityId, employeeId);
      toast.success("Assigned", { description: `Assigned to ${employeeName}.` });
    });
  }

  function handleUnassign() {
    setValue("");
    startTransition(async () => {
      await onUnassign(entityId);
      toast.info("Unassigned");
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