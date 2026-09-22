"use client";

import { useActionState, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { SearchableSelectField } from "@/app/(dashboard)/dashboard/admin/profiles/tabs/searchable-select-field";

type Profile = { id: string; name: string; profileCode: string };
type Plan = { id: string; name: string; price: number; durationDays: number };

interface AttachSubscriptionFormProps {
  profiles: Profile[];
  plans: Plan[];
  action: (prevState: unknown, formData: FormData) => Promise<{ error: string | null }>;
}

export function AttachSubscriptionForm({ profiles, plans, action }: AttachSubscriptionFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [profileId, setProfileId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const selectedPlan = useMemo(() => plans.find((p) => p.id === planId), [planId, plans]);

  const calculatedEndDate = useMemo(() => {
    if (!selectedPlan || !startDate) return null;
    const end = new Date(startDate);
    end.setDate(end.getDate() + selectedPlan.durationDays);
    return end.toISOString().slice(0, 10);
  }, [selectedPlan, startDate]);

  const [endDate, setEndDate] = useState("");
  const [endDateManuallySet, setEndDateManuallySet] = useState(false);

  useEffect(() => {
    if (!endDateManuallySet && calculatedEndDate) {
      setEndDate(calculatedEndDate);
    }
  }, [calculatedEndDate, endDateManuallySet]);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SearchableSelectField
              name="profileId"
              label="Profile"
              value={profileId}
              onValueChange={setProfileId}
              options={profiles.map((p) => ({ id: p.id, name: `${p.name} (${p.profileCode})` }))}
              placeholder="Select a profile"
              required
            />

            <SearchableSelectField
              name="planId"
              label="Plan"
              value={planId}
              onValueChange={setPlanId}
              options={plans.map((p) => ({ id: p.id, name: `${p.name} — ₹${p.price.toLocaleString("en-IN")} (${p.durationDays} days)` }))}
              placeholder="Select a plan"
              required
            />

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {calculatedEndDate && (
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setEndDateManuallySet(true);
                  }}
                />
              </div>
            )}
          </div>

          <input type="hidden" name="status" value="ACTIVE" />

          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending || !profileId || !planId}>
              {isPending ? "Attaching..." : "Attach Service"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/admin/services">
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
