"use client";
import { useMemo } from "react";
import { Country, State, City } from "country-state-city";
import { MultiSelectSearchableField } from "@/app/(dashboard)/dashboard/admin/profiles/tabs/multi-select-searchable-field";
import {
  MARITAL_STATUS_OPTIONS,
  MANGLIK_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  OCCUPATION_OPTIONS,
  INCOME_RANGES_GENERIC,
  CURRENCY_OPTIONS,
  VISA_STATUS_OPTIONS,
} from "@/lib/constants/profile-options";

const CHILDREN_OK_OPTIONS = ["Yes", "No"];
const DIET_OPTIONS = ["Vegetarian", "Non-Vegetarian", "Eggetarian"];
const DRINKING_SMOKING_OPTIONS = ["Never", "Occasionally"];

export type RefOption = { id: string; name: string };

export type PPCriteria = {
  minAge: string;
  maxAge: string;
  minHeight: string;
  maxHeight: string;
  maritalStatusMulti: string[];
  motherTongueIds: string[];
  religionIds: string[];
  casteIds: string[];
  manglikStatusMulti: string[];
  hasChildrenOkMulti: string[];
  countryMulti: string[];
  stateMulti: string[];
  cityMulti: string[];
  qualificationMulti: string[];
  professionMulti: string[];
  annualIncomeCurrency: string;
  annualIncomeRanges: string[];
  dietMulti: string[];
  drinkingMulti: string[];
  smokingMulti: string[];
  visaStatusMulti: string[];
  aboutDesiredPartner: string;
};

export const EMPTY_PP_CRITERIA: PPCriteria = {
  minAge: "",
  maxAge: "",
  minHeight: "",
  maxHeight: "",
  maritalStatusMulti: [],
  motherTongueIds: [],
  religionIds: [],
  casteIds: [],
  manglikStatusMulti: [],
  hasChildrenOkMulti: [],
  countryMulti: [],
  stateMulti: [],
  cityMulti: [],
  qualificationMulti: [],
  professionMulti: [],
  annualIncomeCurrency: "",
  annualIncomeRanges: [],
  dietMulti: [],
  drinkingMulti: [],
  smokingMulti: [],
  visaStatusMulti: [],
  aboutDesiredPartner: "",
};

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PPCriteriaFields({
  value,
  onChange,
  religions,
  castes,
  motherTongues,
}: {
  value: PPCriteria;
  onChange: (next: PPCriteria) => void;
  religions: RefOption[];
  castes: RefOption[];
  motherTongues: RefOption[];
}) {
  function set<K extends keyof PPCriteria>(key: K, v: PPCriteria[K]) {
    onChange({ ...value, [key]: v });
  }

  const allCountries = useMemo(() => Country.getAllCountries(), []);
  const selectedCountryIsos = useMemo(
    () => allCountries.filter((c) => value.countryMulti.includes(c.name)).map((c) => c.isoCode),
    [allCountries, value.countryMulti]
  );
  const availableStates = useMemo(() => {
    if (selectedCountryIsos.length === 0) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const iso of selectedCountryIsos) {
      for (const s of State.getStatesOfCountry(iso)) {
        if (!seen.has(s.name)) {
          seen.add(s.name);
          result.push(s.name);
        }
      }
    }
    return result.sort();
  }, [selectedCountryIsos]);
  const availableCities = useMemo(() => {
    if (selectedCountryIsos.length === 0 || value.stateMulti.length === 0) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const iso of selectedCountryIsos) {
      for (const s of State.getStatesOfCountry(iso)) {
        if (!value.stateMulti.includes(s.name)) continue;
        for (const city of City.getCitiesOfState(iso, s.isoCode)) {
          if (!seen.has(city.name)) {
            seen.add(city.name);
            result.push(city.name);
          }
        }
      }
    }
    return result.sort();
  }, [selectedCountryIsos, value.stateMulti]);

  function handleCountryChange(next: string[]) {
    const isos = allCountries.filter((c) => next.includes(c.name)).map((c) => c.isoCode);
    const validStates = new Set<string>();
    for (const iso of isos) for (const s of State.getStatesOfCountry(iso)) validStates.add(s.name);
    onChange({
      ...value,
      countryMulti: next,
      stateMulti: value.stateMulti.filter((s) => validStates.has(s)),
      cityMulti: [],
    });
  }
  function handleStateChange(next: string[]) {
    onChange({ ...value, stateMulti: next, cityMulti: [] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">AGE &amp; HEIGHT</h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Min Age</label>
            <input
              type="number"
              className={fieldClass}
              value={value.minAge}
              onChange={(e) => set("minAge", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Max Age</label>
            <input
              type="number"
              className={fieldClass}
              value={value.maxAge}
              onChange={(e) => set("maxAge", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Min Height</label>
            <input
              className={fieldClass}
              value={value.minHeight}
              onChange={(e) => set("minHeight", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Max Height</label>
            <input
              className={fieldClass}
              value={value.maxHeight}
              onChange={(e) => set("maxHeight", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">BASIC PREFERENCES</h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <MultiSelectSearchableField
            allowOpenToAll
            name="maritalStatus"
            label="Marital Status"
            options={MARITAL_STATUS_OPTIONS}
            value={value.maritalStatusMulti}
            onValueChange={(v) => set("maritalStatusMulti", v)}
            placeholder="Any marital status"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="motherTongue"
            label="Mother Tongue"
            options={motherTongues}
            value={value.motherTongueIds}
            onValueChange={(v) => set("motherTongueIds", v)}
            placeholder="Any mother tongue"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="religion"
            label="Religion"
            options={religions}
            value={value.religionIds}
            onValueChange={(v) => set("religionIds", v)}
            placeholder="Any religion"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="caste"
            label="Caste"
            options={castes}
            value={value.casteIds}
            onValueChange={(v) => set("casteIds", v)}
            placeholder="Any caste"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="manglikStatus"
            label="Manglik Status"
            options={MANGLIK_OPTIONS}
            value={value.manglikStatusMulti}
            onValueChange={(v) => set("manglikStatusMulti", v)}
            placeholder="Any"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="hasChildrenOk"
            label="Partner Has Children?"
            options={CHILDREN_OK_OPTIONS}
            value={value.hasChildrenOkMulti}
            onValueChange={(v) => set("hasChildrenOkMulti", v)}
            placeholder="Doesn't matter"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">LOCATION PREFERENCES</h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <MultiSelectSearchableField
            allowOpenToAll
            name="country"
            label="Country"
            value={value.countryMulti}
            onValueChange={handleCountryChange}
            options={allCountries.map((c) => c.name)}
            placeholder="Any country"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="state"
            label="State"
            value={value.stateMulti}
            onValueChange={handleStateChange}
            options={availableStates}
            disabled={selectedCountryIsos.length === 0}
            placeholder={selectedCountryIsos.length === 0 ? "Select country first" : "Any state"}
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="city"
            label="City"
            value={value.cityMulti}
            onValueChange={(v) => set("cityMulti", v)}
            options={availableCities}
            disabled={value.stateMulti.length === 0}
            placeholder={value.stateMulti.length === 0 ? "Select state first" : "Any city"}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">EDUCATION &amp; CAREER</h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <MultiSelectSearchableField
            allowOpenToAll
            name="qualification"
            label="Qualification"
            options={EDUCATION_LEVEL_OPTIONS}
            value={value.qualificationMulti}
            onValueChange={(v) => set("qualificationMulti", v)}
            placeholder="Any qualification"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="profession"
            label="Profession"
            options={OCCUPATION_OPTIONS}
            value={value.professionMulti}
            onValueChange={(v) => set("professionMulti", v)}
            placeholder="Any profession"
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Annual Income Currency</label>
            <select
              className={fieldClass}
              value={value.annualIncomeCurrency}
              onChange={(e) => set("annualIncomeCurrency", e.target.value)}
            >
              <option value="">Select currency</option>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <MultiSelectSearchableField
            allowOpenToAll
            name="annualIncomeRanges"
            label="Annual Income Range"
            options={INCOME_RANGES_GENERIC}
            value={value.annualIncomeRanges}
            onValueChange={(v) => set("annualIncomeRanges", v)}
            placeholder="Any income range"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">LIFESTYLE</h3>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <MultiSelectSearchableField
            allowOpenToAll
            name="diet"
            label="Diet"
            options={DIET_OPTIONS}
            value={value.dietMulti}
            onValueChange={(v) => set("dietMulti", v)}
            placeholder="Any diet"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="drinking"
            label="Drinking"
            options={DRINKING_SMOKING_OPTIONS}
            value={value.drinkingMulti}
            onValueChange={(v) => set("drinkingMulti", v)}
            placeholder="Doesn't matter"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="smoking"
            label="Smoking"
            options={DRINKING_SMOKING_OPTIONS}
            value={value.smokingMulti}
            onValueChange={(v) => set("smokingMulti", v)}
            placeholder="Doesn't matter"
          />
          <MultiSelectSearchableField
            allowOpenToAll
            name="visaStatus"
            label="Visa Status"
            options={VISA_STATUS_OPTIONS}
            value={value.visaStatusMulti}
            onValueChange={(v) => set("visaStatusMulti", v)}
            placeholder="Doesn't matter"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">About Desired Partner</label>
        <textarea
          className={cn_fieldClass()}
          value={value.aboutDesiredPartner}
          onChange={(e) => set("aboutDesiredPartner", e.target.value)}
        />
      </div>
    </div>
  );
}

function cn_fieldClass() {
  return fieldClass + " min-h-[90px]";
}
