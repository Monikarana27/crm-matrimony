"use client";

import { useActionState } from "react";
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
import { useState } from "react";

interface PlanFormProps {
  mode: "create" | "edit";
  defaultValues?: {
    name: string;
    price: number;
    currency?: string;
    durationDays: number;
    description: string | null;
    active: boolean;
  };
  action: (prevState: unknown, formData: FormData) => Promise<{ error: string | null }>;
}

export function PlanForm({ mode, defaultValues, action }: PlanFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [currency, setCurrency] = useState(defaultValues?.currency ?? "INR");
  const currencySymbol = currency === "USD" ? "$" : "₹";

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={defaultValues?.name}
                placeholder="e.g. Gold - 6 Months"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price ({currencySymbol})</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                defaultValue={defaultValues?.price}
                placeholder="25000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="currency" value={currency} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationDays">Duration (days)</Label>
              <Input
                id="durationDays"
                name="durationDays"
                type="number"
                defaultValue={defaultValues?.durationDays}
                placeholder="180"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              defaultValue={defaultValues?.description ?? ""}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
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
              Active (available to attach to profiles)
            </Label>
          </div>

          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Create Plan" : "Save Changes"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/admin/plans">
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