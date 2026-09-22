"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "./searchable-combobox";

type Option = { value: string; label: string };

function normalize(options: string[] | { id: string; name: string }[]): Option[] {
  if (options.length === 0) return [];
  if (typeof options[0] === "string") {
    return (options as string[]).map((o) => ({ value: o, label: o }));
  }
  return (options as { id: string; name: string }[]).map((o) => ({ value: o.id, label: o.name }));
}

export function SearchableSelectField({
  name,
  label,
  defaultValue,
  value: controlledValue,
  onValueChange,
  options,
  required = false,
  placeholder = "Select...",
  disabled = false,
  allowCustom = true,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: string[] | { id: string; name: string }[];
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
}) {
  const baseNormalized = normalize(options);
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");

  // Preserve a defaultValue that isn't in the known options list (e.g. legacy
  // free-text data, or a previously-typed custom value) so it still displays
  // correctly instead of showing the placeholder.
  const [customOptions, setCustomOptions] = useState<Option[]>(() =>
    defaultValue && !baseNormalized.some((o) => o.value === defaultValue)
      ? [{ value: defaultValue, label: defaultValue }]
      : []
  );

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = onValueChange ?? setInternalValue;

  const normalized = useMemo(() => {
    const known = new Set(baseNormalized.map((o) => o.value));
    return [...baseNormalized, ...customOptions.filter((o) => !known.has(o.value))];
  }, [baseNormalized, customOptions]);

  function handleCreateNew(text: string) {
    setCustomOptions((prev) =>
      prev.some((o) => o.value === text) ? prev : [...prev, { value: text, label: text }]
    );
    setValue(text);
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
        onValueChange={setValue}
        options={normalized}
        placeholder={placeholder}
        searchPlaceholder={`Search ${label.toLowerCase()}...`}
        disabled={disabled}
        allowCreate={allowCustom}
        onCreateNew={handleCreateNew}
      />
      <input type="hidden" name={name} value={value} required={required} />
    </div>
  );
}
