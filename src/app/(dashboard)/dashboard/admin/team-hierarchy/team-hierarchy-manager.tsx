"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getManagersForRole,
  getEmployeesForRole,
  bulkAssignTeamAction,
} from "@/actions/employees/team-assignment.actions";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/hierarchy/manager-role-map";

type Manager = { id: string; name: string; role: string };
type Employee = {
  id: string;
  name: string;
  email: string;
  managerId: string | null;
  manager: { id: string; name: string } | null;
};

export function TeamHierarchyManager() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [managers, setManagers] = useState<Manager[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedLeaderId("");
    setEmployees([]);
    setCheckedIds(new Set());
    setMessage(null);
    if (!selectedRole) {
      setManagers([]);
      return;
    }
    getManagersForRole(selectedRole).then(setManagers);
    getEmployeesForRole(selectedRole).then(setEmployees);
  }, [selectedRole]);

  useEffect(() => {
    if (!selectedLeaderId) {
      setCheckedIds(new Set());
      return;
    }
    const preChecked = new Set(
      employees.filter((e) => e.managerId === selectedLeaderId).map((e) => e.id)
    );
    setCheckedIds(preChecked);
  }, [selectedLeaderId, employees]);

  function toggleEmployee(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAssign() {
    if (!selectedLeaderId) return;

    const conflicts = employees.filter(
      (e) =>
        checkedIds.has(e.id) &&
        e.managerId &&
        e.managerId !== selectedLeaderId
    );

    if (conflicts.length > 0) {
      const names = conflicts.map((e) => `${e.name} (currently under ${e.manager?.name})`).join(", ");
      const confirmed = window.confirm(
        `The following employees will be reassigned:\n\n${names}\n\nContinue?`
      );
      if (!confirmed) return;
    }

    startTransition(async () => {
      const result = await bulkAssignTeamAction(
        selectedLeaderId,
        selectedRole,
        Array.from(checkedIds)
      );
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage("Team assignment saved.");
        getEmployeesForRole(selectedRole).then(setEmployees);
      }
    });
  }

  const selectedLeader = managers.find((m) => m.id === selectedLeaderId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Assign</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Select Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="-- Select Role --" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select Team Leader / Manager</Label>
            <Select
              value={selectedLeaderId}
              onValueChange={setSelectedLeaderId}
              disabled={!selectedRole}
            >
              <SelectTrigger>
                <SelectValue placeholder="-- Select Team Leader --" />
              </SelectTrigger>
              <SelectContent>
                {managers.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No eligible managers found for this role
                  </div>
                ) : (
                  managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({ROLE_LABELS[m.role] ?? m.role})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedLeaderId && (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">
              Team members for {selectedLeader?.name}
            </p>
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active employees with this role.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {employees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-2 rounded-md border p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checkedIds.has(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="flex-1">
                      {emp.name}
                      {emp.manager && emp.manager.id !== selectedLeaderId && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (currently under {emp.manager.name})
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {message && <p className="text-sm text-muted-foreground">{message}</p>}

            <Button onClick={handleAssign} disabled={isPending}>
              {isPending ? "Saving..." : "Assign Selected"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}