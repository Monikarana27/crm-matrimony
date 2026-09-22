"use client";

import { useEffect, useState } from "react";
import { Field, TextAreaField } from "./field";
import { MultiSelectSearchableField } from "./multi-select-searchable-field";
import { SearchableSelectField } from "./searchable-select-field";
import { LocationMultiFields } from "./location-multi-fields";
import {
  getReligions,
  getCastes,
  getMotherTongues,
} from "@/actions/master-data/master-data.actions";
import {
  MANGLIK_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  OCCUPATION_OPTIONS,
} from "@/lib/constants/profile-options";
import {
  MARITAL_STATUS_OPTIONS,
  INCOME_RANGES_GENERIC,
  CURRENCY_OPTIONS,
} from "@/lib/constants/profile-options";

const CHILDREN_OK_OPTIONS = ["Yes", "No"];
const DIET_OPTIONS = ["Vegetarian", "Non-Vegetarian", "Eggetarian"];
const DRINKING_SMOKING_OPTIONS = ["Never", "Occasionally"];

type RefOption = { id: string; name: string };

export function PartnerPreferenceTab({ defaultValues }: { defaultValues: Record<string, any> }) {
  const pp = defaultValues.partnerPreference ?? {};

  const [religions, setReligions] = useState<RefOption[]>([]);
  const [castes, setCastes] = useState<RefOption[]>([]);
  const [motherTongues, setMotherTongues] = useState<RefOption[]>([]);

  useEffect(() => {
    getReligions().then(setReligions);
    // Caste list is intentionally NOT filtered by religion here — all castes are shown.
    getCastes().then(setCastes);
    getMotherTongues().then(setMotherTongues);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
          AGE & HEIGHT
        </h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field name="ppMinAge" label="Min Age" type="number" defaultValue={pp.minAge} />
          <Field name="ppMaxAge" label="Max Age" type="number" defaultValue={pp.maxAge} />
          <Field name="ppMinHeight" label="Min Height" defaultValue={pp.minHeight} />
          <Field name="ppMaxHeight" label="Max Height" defaultValue={pp.maxHeight} />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
          BASIC PREFERENCES
        </h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <MultiSelectSearchableField
            allowOpenToAll
            name="ppMaritalStatus"
            label="Marital Status"
            options={MARITAL_STATUS_OPTIONS}
            defaultValue={pp.maritalStatusMulti}
            placeholder="Any marital status"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="ppMotherTongueId"
            label="Mother Tongue"
            options={motherTongues}
            defaultValue={pp.motherTongueIds}
            placeholder="Any mother tongue"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="ppReligionId"
            label="Religion"
            options={religions}
            defaultValue={pp.religionIds}
            placeholder="Any religion"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="ppCasteId"
            label="Caste"
            options={castes}
            defaultValue={pp.casteIds}
            placeholder="Any caste"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="ppManglikStatus"
            label="Manglik Status"
            options={MANGLIK_OPTIONS}
            defaultValue={pp.manglikStatusMulti}
            placeholder="Any"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="ppHasChildrenOk"
            label="Partner Has Children?"
            options={CHILDREN_OK_OPTIONS}
            defaultValue={pp.hasChildrenOkMulti}
            placeholder="Doesn't matter"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
          LOCATION PREFERENCES
        </h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <LocationMultiFields
            countryField="ppCountry"
            stateField="ppState"
            cityField="ppCity"
            defaultCountries={pp.countryMulti}
            defaultStates={pp.stateMulti}
            defaultCities={pp.cityMulti}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
          EDUCATION & CAREER
        </h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <MultiSelectSearchableField
            allowOpenToAll
            name="ppQualification"
            label="Qualification"
            options={EDUCATION_LEVEL_OPTIONS}
            defaultValue={pp.qualificationMulti}
            placeholder="Any qualification"
          />
          <Field name="ppWorkingWith" label="Working With" defaultValue={pp.workingWith} />
          <MultiSelectSearchableField
            allowOpenToAll
            name="ppProfession"
            label="Profession"
            options={OCCUPATION_OPTIONS}
            defaultValue={pp.professionMulti}
            placeholder="Any profession"
          />
          <SearchableSelectField
            name="ppAnnualIncomeCurrency"
            label="Annual Income Currency"
            options={CURRENCY_OPTIONS.map((c) => ({ id: c.code, name: `${c.code} - ${c.name}` }))}
            defaultValue={pp.annualIncomeCurrency}
            placeholder="Select currency"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="ppAnnualIncomeRanges"
            label="Annual Income Range"
            options={INCOME_RANGES_GENERIC}
            defaultValue={pp.annualIncomeRanges}
            placeholder="Any income range"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
          LIFESTYLE
        </h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <MultiSelectSearchableField
            allowOpenToAll
            name="ppDiet"
            label="Diet"
            options={DIET_OPTIONS}
            defaultValue={pp.dietMulti}
            placeholder="Any diet"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="ppDrinking"
            label="Drinking"
            options={DRINKING_SMOKING_OPTIONS}
            defaultValue={pp.drinkingMulti}
            placeholder="Doesn't matter"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="ppSmoking"
            label="Smoking"
            options={DRINKING_SMOKING_OPTIONS}
            defaultValue={pp.smokingMulti}
            placeholder="Doesn't matter"
          />
        </div>
      </div>

      <TextAreaField
        name="ppAboutDesiredPartner"
        label="About Desired Partner"
        defaultValue={pp.aboutDesiredPartner}
      />
    </div>
  );
}
