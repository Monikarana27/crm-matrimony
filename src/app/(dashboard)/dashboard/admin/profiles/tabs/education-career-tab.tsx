"use client";

import { useState } from "react";
import { Field } from "./field";
import { SearchableSelectField } from "./searchable-select-field";
import {
  EDUCATION_LEVEL_OPTIONS,
  EDUCATION_FIELD_OPTIONS,
  OCCUPATION_OPTIONS,
  INCOME_RANGES,
  INCOME_RANGES_GENERIC,
  CURRENCY_OPTIONS,
} from "@/lib/constants/profile-options";

const CUSTOM_INCOME = "Custom amount…";

export function EducationCareerTab({ defaultValues }: { defaultValues: Record<string, any> }) {
  const [currency, setCurrency] = useState<string>(defaultValues.annualIncomeCurrency || "INR");
  const incomeOptions = !currency || currency === "INR" ? INCOME_RANGES : INCOME_RANGES_GENERIC;

  // A saved income that isn't one of the preset ranges was typed in as a custom amount.
  const saved: string = defaultValues.annualIncome ?? "";
  const savedIsCustom =
    !!saved && ![...INCOME_RANGES, ...INCOME_RANGES_GENERIC].includes(saved);
  const [choice, setChoice] = useState<string>(savedIsCustom ? CUSTOM_INCOME : saved);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <SearchableSelectField
        name="highestQualification"
        label="Highest Qualification"
        options={EDUCATION_LEVEL_OPTIONS}
        defaultValue={defaultValues.highestQualification}
      />
      <SearchableSelectField
        name="educationField"
        label="Education Field"
        options={EDUCATION_FIELD_OPTIONS}
        defaultValue={defaultValues.educationField}
      />
      <Field name="institute" label="Institute" defaultValue={defaultValues.institute} />
      <Field name="workLocation" label="Work Location" defaultValue={defaultValues.workLocation} />
      <Field name="workingWith" label="Working With" defaultValue={defaultValues.workingWith} />
      <SearchableSelectField
        name="profession"
        label="Profession / Job Sector"
        options={OCCUPATION_OPTIONS}
        defaultValue={defaultValues.profession}
      />
      <Field name="businessName" label="Business Name" defaultValue={defaultValues.businessName} />
      <Field name="designation" label="Designation" defaultValue={defaultValues.designation} />
      <SearchableSelectField
        name="annualIncomeCurrency"
        label="Annual Income Currency"
        options={CURRENCY_OPTIONS.map((c) => ({ id: c.code, name: `${c.code} - ${c.name}` }))}
        value={currency}
        onValueChange={(v: string) => {
          setCurrency(v);
          // Preset ranges differ by currency, so clear a preset pick; keep a custom choice.
          if (choice !== CUSTOM_INCOME) setChoice("");
        }}
        placeholder="Select currency"
      />
      {/* The select is only a chooser; the real annualIncome value is submitted below. */}
      <SearchableSelectField
        key={currency}
        name="annualIncomeChoice"
        label="Annual Income"
        options={[...incomeOptions, CUSTOM_INCOME]}
        value={choice}
        onValueChange={setChoice}
        placeholder="Select income"
      />
      {choice === CUSTOM_INCOME ? (
        <div className="md:col-span-2">
          <Field
            name="annualIncome"
            label="Custom Annual Income (e.g. 12 Lakh, 1.5 Crore, 1200000)"
            defaultValue={savedIsCustom ? saved : ""}
          />
        </div>
      ) : (
        <input type="hidden" name="annualIncome" value={choice} />
      )}
    </div>
  );
}
