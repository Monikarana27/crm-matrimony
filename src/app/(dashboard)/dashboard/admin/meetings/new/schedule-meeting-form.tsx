"use client";

import { useActionState, useState } from "react";
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
import {
  AsyncSearchableCombobox,
  type AsyncComboboxOption,
} from "@/components/shared/async-searchable-combobox";
import {
  searchAttachableRecords,
  searchEmployeesForMention,
} from "@/actions/workspace/workspace.actions";

interface ScheduleMeetingFormProps {
  action: (prevState: unknown, formData: FormData) => Promise<{ error: string | null }>;
}

export function ScheduleMeetingForm({ action }: ScheduleMeetingFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [profileId, setProfileId] = useState("");
  const [profileLabel, setProfileLabel] = useState("");
  const [profileTwoId, setProfileTwoId] = useState("");
  const [profileTwoLabel, setProfileTwoLabel] = useState("");
  const [type, setType] = useState("TELE");
  const [assignedToId, setAssignedToId] = useState("");
  const [assignedToLabel, setAssignedToLabel] = useState("");

  async function searchProfiles(query: string): Promise<AsyncComboboxOption[]> {
    const results = await searchAttachableRecords("PROFILE", query);
    return results;
  }

  async function searchProfilesExcludingOne(query: string): Promise<AsyncComboboxOption[]> {
    const results = await searchAttachableRecords("PROFILE", query);
    return results.filter((r) => r.id !== profileId);
  }

  async function searchEmployees(query: string): Promise<AsyncComboboxOption[]> {
    const results = await searchEmployeesForMention(query);
    return results.map((e) => ({ id: e.id, label: e.name }));
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Profile One</Label>
              <AsyncSearchableCombobox
                value={profileId}
                onValueChange={(id, label) => {
                  setProfileId(id);
                  setProfileLabel(label ?? "");
                }}
                initialLabel={profileLabel}
                search={searchProfiles}
                placeholder="Select a profile"
                searchPlaceholder="Search by name or code..."
              />
              <input type="hidden" name="profileId" value={profileId} />
            </div>

            <div className="space-y-2">
              <Label>Profile Two (match)</Label>
              <AsyncSearchableCombobox
                value={profileTwoId}
                onValueChange={(id, label) => {
                  setProfileTwoId(id);
                  setProfileTwoLabel(label ?? "");
                }}
                initialLabel={profileTwoLabel}
                search={searchProfilesExcludingOne}
                placeholder="Select the matching profile"
                searchPlaceholder="Search by name or code..."
              />
              <input type="hidden" name="profileTwoId" value={profileTwoId} />
            </div>

            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TELE">Tele Meeting</SelectItem>
                  <SelectItem value="FACE_TO_FACE">Face to Face</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="type" value={type} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Scheduled Date & Time</Label>
              <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Assign To (optional)</Label>
              <AsyncSearchableCombobox
                value={assignedToId}
                onValueChange={(id, label) => {
                  setAssignedToId(id);
                  setAssignedToLabel(label ?? "");
                }}
                initialLabel={assignedToLabel}
                search={searchEmployees}
                placeholder="Select an employee"
                searchPlaceholder="Search employees..."
              />
              <input type="hidden" name="assignedToId" value={assignedToId} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <input type="hidden" name="status" value="SCHEDULED" />

          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending || !profileId || !profileTwoId}>
              {isPending ? "Scheduling..." : "Schedule Meeting"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/admin/meetings">
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
