"use client";

import { useActionState, useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

type ManagerCandidate = { id: string; name: string; role: string };

const MANAGER_ROLE_MAP: Record<string, string[]> = {
  SALES: ["SALES_TL", "SERVICE_MANAGER"],
  SALES_TL: ["SALES_MANAGER"],
  SALES_MANAGER: ["ADMIN", "SUPER_ADMIN"],
  SERVICE: ["SERVICE_TL"],
  SERVICE_TL: ["SERVICE_MANAGER"],
  SERVICE_MANAGER: ["ADMIN", "SUPER_ADMIN"],
};

interface EmployeeFormProps {
  mode: "create" | "edit";
  defaultValues?: {
    name: string;
    email: string;
    phone?: string | null;
    department?: string | null;
    role: string;
    managerId?: string | null;
    active: boolean;
  };
  managerCandidates: ManagerCandidate[];
  action: (prevState: unknown, formData: FormData) => Promise<{ error: string | null }>;
}

export function EmployeeForm({ mode, defaultValues, managerCandidates, action }: EmployeeFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [role, setRole] = useState(defaultValues?.role ?? "SALES");
  const [department, setDepartment] = useState(defaultValues?.department ?? "");
  const [managerId, setManagerId] = useState(defaultValues?.managerId ?? "");

  const eligibleManagers = useMemo(() => {
    const allowedRoles = MANAGER_ROLE_MAP[role];
    if (!allowedRoles) return [];
    return managerCandidates.filter((m) => allowedRoles.includes(m.role));
  }, [role, managerCandidates]);

  const showManagerField = MANAGER_ROLE_MAP[role] !== undefined;

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" defaultValue={defaultValues?.name} placeholder="e.g. Priya Sharma" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={defaultValues?.email} placeholder="priya@elitebandhan.com" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={defaultValues?.phone ?? ""} placeholder="+91 98765 43210" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {mode === "edit" ? "New Password (optional)" : "Password"}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={mode === "edit" ? "Leave blank to keep current" : ""}
                required={mode === "create"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => {
                  setRole(value);
                  setManagerId("");
                }}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SALES">Sales</SelectItem>
                  <SelectItem value="SALES_TL">Sales Team Lead</SelectItem>
                  <SelectItem value="SALES_MANAGER">Sales Manager</SelectItem>
                  <SelectItem value="PROFILE_CREATOR">Profile Creator</SelectItem>
                  <SelectItem value="SERVICE">Service</SelectItem>
                  <SelectItem value="SERVICE_TL">Service Team Lead</SelectItem>
                  <SelectItem value="SERVICE_MANAGER">Sales & Service Manager</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="role" value={role} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALES_EMP">Sales</SelectItem>
                  <SelectItem value="PROFILE_EMP">Profile</SelectItem>
                  <SelectItem value="SERVICE_EMP">Service</SelectItem>
                  <SelectItem value="HR_EMP">HR</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="department" value={department} />
            </div>

            {showManagerField && (
              <div className="space-y-2">
                <Label htmlFor="managerId">Reports To</Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger id="managerId">
                    <SelectValue placeholder="Select a manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleManagers.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No eligible managers found for this role
                      </div>
                    ) : (
                      eligibleManagers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <input type="hidden" name="managerId" value={managerId} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              name="active"
              defaultChecked={defaultValues?.active ?? true}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="active" className="cursor-pointer font-normal">
              Active (employee can log in)
            </Label>
          </div>

          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Create Employee" : "Save Changes"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/admin/employees">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}