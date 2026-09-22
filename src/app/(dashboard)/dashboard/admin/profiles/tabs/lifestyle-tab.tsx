"use client";

import { SearchableSelectField } from "./searchable-select-field";

const DIET_OPTIONS = ["Vegetarian", "Non-Vegetarian", "Occasionally Non-Veg", "Eggetarian", "Vegan", "Jain"];
const DRINKING_OPTIONS = ["Never", "Occasionally", "Regularly"];
const SMOKING_OPTIONS = ["Never", "Occasionally", "Regularly"];

export function LifestyleTab({ defaultValues }: { defaultValues: Record<string, any> }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <SearchableSelectField name="diet" label="Diet" options={DIET_OPTIONS} defaultValue={defaultValues.diet} />
      <SearchableSelectField
        name="drinking"
        label="Drinking"
        options={DRINKING_OPTIONS}
        defaultValue={defaultValues.drinking}
      />
      <SearchableSelectField
        name="smoking"
        label="Smoking"
        options={SMOKING_OPTIONS}
        defaultValue={defaultValues.smoking}
      />
    </div>
  );
}
