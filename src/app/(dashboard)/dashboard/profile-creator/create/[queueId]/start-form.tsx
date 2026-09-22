"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, SelectField } from "@/app/(dashboard)/dashboard/admin/profiles/tabs/field";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";

const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"];
const SOURCE_OPTIONS = ["Website", "Justdial", "Referral", "Walk-in", "Phone Inquiry", "WhatsApp", "Shaadi.com", "Other"];

export function StartForm({
  defaultValues,
  action,
}: {
  defaultValues: { name: string; phone: string; email: string | null };
  action: (prevState: unknown, formData: FormData) => Promise<{ error: string | null }>;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field name="name" label="Name" defaultValue={defaultValues.name} required />
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <PhoneInput name="phone" defaultValue={defaultValues.phone} />
            </div>
            <Field name="email" label="Email" type="email" defaultValue={defaultValues.email ?? ""} />
            <SelectField name="gender" label="Gender" options={GENDER_OPTIONS} required placeholder="Select gender" />
            <SelectField name="source" label="Source" options={SOURCE_OPTIONS} placeholder="Select source" />
          </div>

          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Starting..." : "Start Profile"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}