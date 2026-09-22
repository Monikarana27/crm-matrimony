"use client";
import { useState } from "react";
import { Field } from "./field";
import { SearchableSelectField } from "./searchable-select-field";
import { ReferenceSelect } from "./reference-select";
import {
  getReligions,
  getCastes,
  getGotras,
  getOrCreateReligionAction,
  getOrCreateCasteAction,
  getOrCreateGotraAction,
} from "@/actions/master-data/master-data.actions";
import { MANGLIK_OPTIONS } from "@/lib/constants/profile-options";

export function ReligionHoroscopeTab({ defaultValues }: { defaultValues: Record<string, any> }) {
  const [religionId, setReligionId] = useState(defaultValues.religionId ?? "");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
          RELIGION & CASTE
        </h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ReferenceSelect
            name="religionId"
            label="Religion"
            defaultValue={defaultValues.religionId}
            fetchOptions={() => getReligions()}
            onValueChange={setReligionId}
            onCreateOption={(name) => getOrCreateReligionAction(name)}
          />
          <ReferenceSelect
            name="casteId"
            label="Caste"
            defaultValue={defaultValues.casteId}
            dependsOnValue={religionId}
            fetchOptions={(rid) => getCastes(rid || undefined)}
            onCreateOption={(name) => getOrCreateCasteAction(name, religionId || undefined)}
          />
          <Field name="subCaste" label="Sub Caste" defaultValue={defaultValues.subCaste} />
          <ReferenceSelect
            name="gotraId"
            label="Gotra"
            defaultValue={defaultValues.gotraId}
            fetchOptions={() => getGotras()}
            onCreateOption={(name) => getOrCreateGotraAction(name)}
          />
        </div>
      </div>
      <div>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
          HOROSCOPE
        </h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field name="timeOfBirth" label="Time of Birth" defaultValue={defaultValues.timeOfBirth} />
          <Field name="placeOfBirth" label="Place of Birth" defaultValue={defaultValues.placeOfBirth} />
          <SearchableSelectField
            name="manglik"
            label="Manglik"
            options={MANGLIK_OPTIONS}
            defaultValue={defaultValues.manglik}
          />
          <Field name="rashi" label="Rashi" defaultValue={defaultValues.rashi} />
          <Field name="nakshatra" label="Nakshatra" defaultValue={defaultValues.nakshatra} />
        </div>
      </div>
    </div>
  );
}
