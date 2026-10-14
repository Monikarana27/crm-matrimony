"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export type AsyncComboboxOption = { id: string; label: string };

export function AsyncSearchableCombobox({
  id,
  value,
  onValueChange,
  initialLabel,
  search,
  placeholder = "Search...",
  searchPlaceholder = "Type to search...",
  disabled = false,
  minChars = 2,
  debounceMs = 300,
  loadOnOpen = false,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string, label?: string) => void;
  initialLabel?: string;
  search: (query: string) => Promise<AsyncComboboxOption[]>;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  minChars?: number;
  debounceMs?: number;
  loadOnOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AsyncComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSelectedLabel(initialLabel ?? "");
  }, [initialLabel]);

  // With loadOnOpen, the list loads as soon as the dropdown opens (no typing needed).
  const effectiveMin = loadOnOpen ? 0 : minChars;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!open || query.trim().length < effectiveMin) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const delay = query.trim() === "" ? 0 : debounceMs;
    debounceRef.current = setTimeout(() => {
      search(query.trim())
        .then((res) => setResults(res))
        .finally(() => setLoading(false));
    }, delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults([]);
    }
  }

  function handleSelect(opt: AsyncComboboxOption) {
    onValueChange(opt.id, opt.label);
    setSelectedLabel(opt.label);
    setOpen(false);
    setQuery("");
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onValueChange("", "");
    setSelectedLabel("");
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            {value && selectedLabel ? selectedLabel : <span className="text-muted-foreground">{placeholder}</span>}
            <span className="ml-2 flex shrink-0 items-center gap-1">
              {value && selectedLabel && !disabled && (
                <X className="h-4 w-4 opacity-50 hover:opacity-100" onClick={handleClear} />
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </span>
          </Button>
        }
      />
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}
            {!loading && query.trim().length < effectiveMin && (
              <CommandEmpty>Type at least {effectiveMin} characters to search.</CommandEmpty>
            )}
            {!loading && query.trim().length >= effectiveMin && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {!loading && results.length > 0 && (
              <CommandGroup>
                {results.map((opt) => (
                  <CommandItem key={opt.id} value={opt.id} onSelect={() => handleSelect(opt)}>
                    <Check
                      className={cn("mr-2 h-4 w-4", value === opt.id ? "opacity-100" : "opacity-0")}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
