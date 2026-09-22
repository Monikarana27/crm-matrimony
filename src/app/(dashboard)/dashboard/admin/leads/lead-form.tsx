"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { LEAD_STATUS_OPTIONS, LEAD_STATUS_LABELS } from "@/lib/leads/lead-status";

const SOURCE_OPTIONS = ["Website", "Justdial", "Referral", "Walk-in", "Phone Inquiry", "WhatsApp", "Shaadi.com", "Meta", "Other"];
const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"];

interface LeadFormProps {
  mode: "create" | "edit";
  defaultValues?: {
    name: string;
    phone: string;
    email: string | null;
    gender: string | null;
    source: string | null;
    status: string;
    notes: string | null;
    followUpDate: string | null;
  };
  action: (prevState: unknown, formData: FormData) => Promise<{ error: string | null }>;
  employees?: { id: string; name: string; role: string }[];
}

export function LeadForm({ mode, defaultValues, action, employees }: LeadFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [source, setSource] = useState(defaultValues?.source ?? "");
  const [status, setStatus] = useState(defaultValues?.status ?? "NEW");
  const [gender, setGender] = useState(defaultValues?.gender ?? "");
  const [assignedToId, setAssignedToId] = useState("");

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={defaultValues?.name} placeholder="e.g. Rahul Sharma" required />
            </div>
          
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <PhoneInput name="phone" defaultValue={defaultValues?.phone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followUpDate">Follow-up Date</Label>
              <Input id="followUpDate" name="followUpDate" type="date" defaultValue={defaultValues?.followUpDate ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} placeholder="rahul@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="gender" value={gender} />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="source" value={source} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{LEAD_STATUS_LABELS[opt]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="status" value={status} />
            </div>
            {mode === "create" && employees && employees.length > 0 && (
              <div className="space-y-2">
                <Label>Assign To (optional)</Label>
                <Select value={assignedToId} onValueChange={setAssignedToId}>
                  <SelectTrigger><SelectValue placeholder="Auto-assign (leave blank)" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="assignedToId" value={assignedToId} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={defaultValues?.notes ?? ""}
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Create Lead" : "Save Changes"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/admin/leads">
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
