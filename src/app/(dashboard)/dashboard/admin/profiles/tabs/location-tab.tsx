"use client";

import { Field } from "./field";
import { CountryStateCityFields } from "./country-state-city-fields";
import { SearchableSelectField } from "./searchable-select-field";
import { VISA_STATUS_OPTIONS } from "@/lib/constants/profile-options";

export function LocationTab({ defaultValues }: { defaultValues: Record<string, any> }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <CountryStateCityFields
        countryField="country"
        stateField="state"
        cityField="city"
        defaultCountry={defaultValues.country}
        defaultState={defaultValues.state}
        defaultCity={defaultValues.city}
      />
      <Field name="citizenship" label="Citizenship" defaultValue={defaultValues.citizenship} />
      <Field name="countryGrewUp" label="Country Grew Up" defaultValue={defaultValues.countryGrewUp} />
      <SearchableSelectField
        name="visaStatus"
        label="Visa Status"
        options={VISA_STATUS_OPTIONS}
        defaultValue={defaultValues.visaStatus}
        placeholder="Select visa status"
      />
    </div>
  );
}
