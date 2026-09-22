"use client";
import { useEffect, useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "./searchable-combobox";

type Option = { id: string; name: string };

export function ReferenceSelect({
  name,
  label,
  defaultValue,
  fetchOptions,
  dependsOnValue,
  onValueChange,
  required = false,
  placeholder = "Select...",
  onCreateOption,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  fetchOptions: (dependsOnValue?: string) => Promise<Option[]>;
  dependsOnValue?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  onCreateOption?: (name: string) => Promise<{ id: string; name: string } | { error: string }>;
}) {
  const [options, setOptions] = useState<Option[]>([]);
  const [value, setValue] = useState(defaultValue ?? "");
  const [loading, setLoading] = useState(true);
  const [creating, startCreateTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOptions(dependsOnValue)
      .then((opts) => {
        if (cancelled) return;
        setOptions(opts);
        if (value && !opts.some((o) => o.id === value)) {
          setValue("");
          onValueChange?.("");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependsOnValue]);

  function handleChange(next: string) {
    setValue(next);
    onValueChange?.(next);
  }

  function handleCreate(name: string) {
    if (!onCreateOption) return;
    setCreateError(null);
    startCreateTransition(async () => {
      const result = await onCreateOption(name);
      if ("error" in result) {
        setCreateError(result.error);
        return;
      }
      setOptions((prev) => [...prev, result]);
      setValue(result.id);
      onValueChange?.(result.id);
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <SearchableCombobox
        id={name}
        value={value}
        onValueChange={handleChange}
        options={options.map((o) => ({ value: o.id, label: o.name }))}
        placeholder={loading ? "Loading..." : placeholder}
        searchPlaceholder={`Search ${label.toLowerCase()}...`}
        disabled={loading}
        allowCreate={!!onCreateOption}
        onCreateNew={handleCreate}
        creating={creating}
      />
      {createError && (
        <p className="text-sm text-destructive">{createError}</p>
      )}
      <input type="hidden" name={name} value={value} required={required} />
    </div>
  );
}
