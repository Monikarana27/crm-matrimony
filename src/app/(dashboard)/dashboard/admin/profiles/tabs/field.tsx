"use client";
import { useState } from "react";
import { calculateAge } from "@/lib/utils/age";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: any;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
      />
    </div>
  );
}

export function TextAreaField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: any;
}) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={4}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>
  );
}

export function SelectField({
  name,
  label,
  defaultValue,
  options,
  required = false,
  placeholder = "Select...",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: string[];
  required?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id={name}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value} required={required} />
    </div>
  );
}

export function DobField({
  name,
  label,
  defaultValue,
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: any;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const age = calculateAge(value || null);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="flex items-center gap-3">
        <Input
          id={name}
          name={name}
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required={required}
        />
        {age !== null && (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            Age: {age}
          </span>
        )}
      </div>
    </div>
  );
}
