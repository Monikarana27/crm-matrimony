"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateSettingAction } from "@/actions/settings/settings.actions";

type SettingRow = { key: string; value: string };

export function SettingsForm({ keys, settings }: { keys: { key: string; label: string }[]; settings: SettingRow[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(keys.map((k) => [k.key, settings.find((s) => s.key === k.key)?.value ?? ""]))
  );
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {keys.map((k) => (
        <div key={k.key} className="flex items-center gap-3">
          <label className="w-48 text-sm">{k.label}</label>
          <input
            value={values[k.key]}
            onChange={(e) => setValues((v) => ({ ...v, [k.key]: e.target.value }))}
            className="h-9 flex-1 rounded-md border border-input px-3 text-sm"
          />
        </div>
      ))}
      <Button
        disabled={isPending}
        onClick={() => startTransition(async () => {
          for (const k of keys) await updateSettingAction(k.key, values[k.key]);
        })}
      >
        {isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}