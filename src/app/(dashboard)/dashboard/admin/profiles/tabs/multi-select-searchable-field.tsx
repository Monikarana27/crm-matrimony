"use client";

import { OPEN_TO_ALL } from "@/lib/constants/profile-options";
import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

type Option = { value: string; label: string };

function normalize(options: string[] | { id: string; name: string }[]): Option[] {
  if (options.length === 0) return [];
  if (typeof options[0] === "string") {
    return (options as string[]).map((o) => ({ value: o, label: o }));
  }
  return (options as { id: string; name: string }[]).map((o) => ({ value: o.id, label: o.name }));
}

export function MultiSelectSearchableField({
  name,
  label,
  defaultValue,
  value: controlledValue,
  onValueChange,
  options,
  required = false,
  placeholder = "Select...",
  disabled = false,
  allowOpenToAll = false,
}: {
  name: string;
  label: string;
  defaultValue?: string[];
  value?: string[];
  onValueChange?: (values: string[]) => void;
  options: string[] | { id: string; name: string }[];
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Adds an exclusive "Open to all" option at the top of the list. */
  allowOpenToAll?: boolean;
}) {
  const normalized = normalize(options);
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue ?? []);
  const [open, setOpen] = useState(false);

  const values = controlledValue !== undefined ? controlledValue : internalValue;
  const setValues = onValueChange ?? setInternalValue;

  const isOpenToAll = allowOpenToAll && values.includes(OPEN_TO_ALL);
  const selected = isOpenToAll
    ? [{ value: OPEN_TO_ALL, label: OPEN_TO_ALL }]
    : normalized.filter((o) => values.includes(o.value));

  function toggle(optValue: string) {
    if (optValue === OPEN_TO_ALL) {
      // Exclusive: "Open to all" replaces any specific choices, and toggles off again.
      setValues(values.includes(OPEN_TO_ALL) ? [] : [OPEN_TO_ALL]);
      return;
    }
    const base = values.filter((v) => v !== OPEN_TO_ALL);
    if (base.includes(optValue)) {
      setValues(base.filter((v) => v !== optValue));
    } else {
      setValues([...base, optValue]);
    }
  }

  function remove(optValue: string) {
    setValues(values.filter((v) => v !== optValue));
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-auto min-h-9 w-full justify-between font-normal"
              disabled={disabled}
            >
              {selected.length > 0 ? (
                <div className="flex flex-wrap gap-1 py-0.5">
                  {selected.map((opt) => (
                    <Badge
                      key={opt.value}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {opt.label}
                      <span
                        role="button"
                        tabIndex={-1}
                        className="rounded-full hover:bg-muted-foreground/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(opt.value);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {allowOpenToAll && (
                  <CommandItem
                    value={OPEN_TO_ALL}
                    onSelect={() => toggle(OPEN_TO_ALL)}
                    className="font-medium"
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", isOpenToAll ? "opacity-100" : "opacity-0")}
                    />
                    {OPEN_TO_ALL}
                  </CommandItem>
                )}
                {normalized.map((opt) => {
                  const isSelected = values.includes(opt.value);
                  return (
                    <CommandItem
                      key={opt.value}
                      value={opt.label}
                      onSelect={() => toggle(opt.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {opt.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {values.length === 0 && required ? (
        <input type="hidden" name={name} value="" required />
      ) : (
        values.map((v) => <input key={v} type="hidden" name={name} value={v} />)
      )}
    </div>
  );
}
