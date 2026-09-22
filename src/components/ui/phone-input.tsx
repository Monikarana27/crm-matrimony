"use client";
import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { popularCountries, otherCountries, parseStoredPhone, type Country } from "@/lib/data/countries";

interface PhoneInputProps {
  name?: string;           // hidden input name for FormData — default "phone"
  defaultValue?: string;   // full stored E.164 value, e.g. for edit forms
  required?: boolean;
  onChange?: (fullNumber: string) => void;
}

function CountryRow({
  c,
  selected,
  onPick,
}: {
  c: Country;
  selected: boolean;
  onPick: (c: Country) => void;
}) {
  return (
    <CommandItem value={c.name + " " + c.dialCode + " " + c.iso} onSelect={() => onPick(c)} className="gap-2">
      <span className="w-6 text-center text-base leading-none">{c.flag}</span>
      <span className="flex-1 truncate">{c.name}</span>
      <span className="text-xs text-muted-foreground">{c.dialCode}</span>
      <Check className={"h-4 w-4 " + (selected ? "opacity-100" : "opacity-0")} />
    </CommandItem>
  );
}

export function PhoneInput({
  name = "phone",
  defaultValue,
  required = true,
  onChange,
}: PhoneInputProps) {
  const initial = parseStoredPhone(defaultValue);
  const [country, setCountry] = useState<Country | null>(initial.country);
  const [local, setLocal] = useState(initial.local);
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);

  const fullNumber = country && local ? `${country.dialCode}${local}` : "";
  const minLen = country ? country.minLength ?? country.length : 0;
  const isFixed = !!country && minLen === country.length;
  const isValid = !!country && local.length >= minLen && local.length <= country.length;

  useEffect(() => {
    onChange?.(fullNumber);
  }, [fullNumber, onChange]);

  function pick(next: Country) {
    setCountry(next);
    setLocal((prev) => prev.slice(0, next.length)); // re-clip if the new max is shorter
    setOpen(false);
  }

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-10 w-[130px] shrink-0 justify-between px-2 font-normal"
              />
            }
          >
              {country ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{country.flag}</span>
                  <span className="text-sm">{country.dialCode}</span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Country</span>
              )}
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Search country or code..." />
              <CommandList className="max-h-[280px]">
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup heading="Popular">
                  {popularCountries.map((c) => (
                    <CountryRow key={c.iso} c={c} selected={country?.iso === c.iso} onPick={pick} />
                  ))}
                </CommandGroup>
                <CommandGroup heading="All countries">
                  {otherCountries.map((c) => (
                    <CountryRow key={c.iso} c={c} selected={country?.iso === c.iso} onPick={pick} />
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <input
          type="text"
          inputMode="numeric"
          value={local}
          disabled={!country}
          onBlur={() => setTouched(true)}
          onChange={(e) => {
            if (!country) return;
            const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, country.length);
            setLocal(digitsOnly);
          }}
          placeholder={country ? (isFixed ? `${country.length}-digit number` : "Phone number") : "Select country first"}
          className="h-10 flex-1 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        />
      </div>
      {touched && country && local.length > 0 && !isValid && (
        <p className="mt-1 text-xs text-red-600">
          {isFixed
            ? `${country.name} numbers should be ${country.length} digits (${local.length}/${country.length})`
            : `${country.name} numbers should be ${minLen}–${country.length} digits`}
        </p>
      )}
      {/* This is what actually gets submitted via FormData */}
      <input type="hidden" name={name} value={fullNumber} required={required} />
    </div>
  );
}
