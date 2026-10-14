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
  searchMeetingClients,
  searchMeetingProspects,
} from "@/actions/meetings/meeting.actions";

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

  async function searchClients(query: string): Promise<AsyncComboboxOption[]> {
    return searchMeetingClients(query);
  }

  async function searchProspects(query: string): Promise<AsyncComboboxOption[]> {
    return searchMeetingProspects(profileId, query);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Client</Label>
              <AsyncSearchableCombobox
                value={profileId}
                onValueChange={(id, label) => {
                  setProfileId(id);
                  setProfileLabel(label ?? "");
                  setProfileTwoId("");
                  setProfileTwoLabel("");
                }}
                initialLabel={profileLabel}
                search={searchClients}
                loadOnOpen
                placeholder="Select a client"
                searchPlaceholder="Search your clients by name or code..."
              />
              <input type="hidden" name="profileId" value={profileId} />
            </div>

            <div className="space-y-2">
              <Label>Prospect</Label>
              {profileId ? (
                <AsyncSearchableCombobox
                  key={profileId}
                  value={profileTwoId}
                  onValueChange={(id, label) => {
                    setProfileTwoId(id);
                    setProfileTwoLabel(label ?? "");
                  }}
                  initialLabel={profileTwoLabel}
                  search={searchProspects}
                  loadOnOpen
                  placeholder="Select a prospect"
                  searchPlaceholder="Search prospects sent to this client..."
                />
              ) : (
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  Select a client first
                </div>
              )}
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
                  <SelectItem value="VC">VC</SelectItem>
                  <SelectItem value="SUCCESS_STORY">Success Story</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="type" value={type} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Scheduled Date & Time</Label>
              <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
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
