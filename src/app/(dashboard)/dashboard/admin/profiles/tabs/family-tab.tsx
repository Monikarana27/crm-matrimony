"use client";

import { Field, TextAreaField } from "./field";
import { SearchableSelectField } from "./searchable-select-field";
import { CURRENCY_OPTIONS } from "@/lib/constants/profile-options";

const FAMILY_TYPE_OPTIONS = ["Nuclear", "Joint"];
const AFFLUENCE_OPTIONS = ["Middle Class", "Upper Middle Class", "Rich", "Affluent", "Elite", "Super Elite", "Ultra Elite"];
const VALUES_OPTIONS = ["Traditional", "Moderate", "Liberal"];

export function FamilyTab({ defaultValues }: { defaultValues: Record<string, any> }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Field
        name="fatherOccupation"
        label="Father's Occupation"
        defaultValue={defaultValues.fatherOccupation}
      />
      <Field
        name="motherOccupation"
        label="Mother's Occupation"
        defaultValue={defaultValues.motherOccupation}
      />
      <Field
        name="brothers"
        label="Brothers"
        type="number"
        defaultValue={defaultValues.brothers ?? 0}
      />
      <Field
        name="brothersMarried"
        label="Brothers Married"
        type="number"
        defaultValue={defaultValues.brothersMarried ?? 0}
      />
      <Field
        name="sisters"
        label="Sisters"
        type="number"
        defaultValue={defaultValues.sisters ?? 0}
      />
      <Field
        name="sistersMarried"
        label="Sisters Married"
        type="number"
        defaultValue={defaultValues.sistersMarried ?? 0}
      />
      <SearchableSelectField
        name="familyType"
        label="Family Type"
        options={FAMILY_TYPE_OPTIONS}
        defaultValue={defaultValues.familyType}
      />
      <SearchableSelectField
        name="affluence"
        label="Affluence"
        options={AFFLUENCE_OPTIONS}
        defaultValue={defaultValues.affluence}
      />
      <SearchableSelectField
        name="familyValues"
        label="Values"
        options={VALUES_OPTIONS}
        defaultValue={defaultValues.familyValues}
      />
      <SearchableSelectField
        name="familyAnnualIncomeCurrency"
        label="Family Annual Income Currency"
        options={CURRENCY_OPTIONS.map((c) => ({ id: c.code, name: `${c.code} - ${c.name}` }))}
        defaultValue={defaultValues.familyAnnualIncomeCurrency || "INR"}
        placeholder="Select currency"
      />
      <Field
        name="familyAnnualIncome"
        label="Family Annual Income"
        defaultValue={defaultValues.familyAnnualIncome}
      />
      <SearchableSelectField
        name="familyNetWorthCurrency"
        label="Family Net Worth Currency"
        options={CURRENCY_OPTIONS.map((c) => ({ id: c.code, name: `${c.code} - ${c.name}` }))}
        defaultValue={defaultValues.familyNetWorthCurrency || "INR"}
        placeholder="Select currency"
      />
      <Field
        name="familyNetWorth"
        label="Family Net Worth"
        defaultValue={defaultValues.familyNetWorth}
      />
      <TextAreaField
        name="familyBio"
        label="Family Bio"
        defaultValue={defaultValues.familyBio}
      />
    </div>
  );
}
