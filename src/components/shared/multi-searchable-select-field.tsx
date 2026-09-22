"use client";

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

export function MultiSearchableSelectField({
  name,
  label,
  value,
  onValueChange,
  options,
  placeholder = "Any",
}: {
  name: string;
  label: string;
  value: string[];
  onValueChange: (values: string[]) => void;
  options: string[] | { id: string; name: string }[];
  placeholder?: string;
}) {
  const normalized = normalize(options);
  const [open, setOpen] = useState(false);

  const selected = normalized.filter((o) => value.includes(o.value));

  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onValueChange(value.filter((v) => v !== optionValue));
    } else {
      onValueChange([...value, optionValue]);
    }
  }

  function remove(optionValue: string) {
    onValueChange(value.filter((v) => v !== optionValue));
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-auto min-h-9 w-full justify-between font-normal"
            >
              <div className="flex flex-1 flex-wrap gap-1">
                {selected.length === 0 ? (
                  <span className="text-muted-foreground">{placeholder}</span>
                ) : (
                  selected.map((opt) => (
                    <Badge
                      key={opt.value}
                      variant="secondary"
                      className="gap-1 pr-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(opt.value);
                      }}
                    >
                      {opt.label}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))
                )}
              </div>
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
                {normalized.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => toggle(opt.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(opt.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
    </div>
  );
}
