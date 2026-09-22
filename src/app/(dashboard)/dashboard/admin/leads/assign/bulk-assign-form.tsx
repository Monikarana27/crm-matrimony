"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { bulkAssignLeadsAction } from "@/actions/leads/lead.actions";
import { toast } from "sonner";

type LeadRow = {
  id: string;
  name: string;
  phone: string;
  status: string;
  source: string | null;
  createdAt: Date;
};

type Employee = { id: string; name: string };

export function BulkAssignForm({ leads, employees }: { leads: LeadRow[]; employees: Employee[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [employeeId, setEmployeeId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const allSelected = leads.length > 0 && selected.size === leads.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAssign() {
    if (selected.size === 0 || !employeeId) return;
    const count = selected.size;
    const employeeName = employees.find((e) => e.id === employeeId)?.name ?? "employee";
    startTransition(async () => {
      await bulkAssignLeadsAction(Array.from(selected), employeeId);
      setMessage(`Assigned ${count} lead(s).`);
      toast.success(`${count} lead${count > 1 ? "s" : ""} assigned`, {
        description: `Assigned to ${employeeName}.`,
      });
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAssign}
            disabled={selected.size === 0 || !employeeId || isPending}
          >
            {isPending ? "Assigning..." : `Assign Selected (${selected.size})`}
          </Button>
          {message && <span className="text-sm text-muted-foreground">{message}</span>}
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Phone</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    No unassigned leads right now.
                  </td>
                </tr>
              )}
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleOne(lead.id)}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{lead.name}</td>
                  <td className="px-3 py-2">{lead.phone}</td>
                  <td className="px-3 py-2">{lead.source ?? "-"}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{lead.status}</Badge>
                  </td>
                  <td className="px-3 py-2">{new Date(lead.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
