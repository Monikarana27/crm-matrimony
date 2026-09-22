"use client";

import { OPEN_TO_ALL } from "@/lib/constants/profile-options";
import { useMemo, useState } from "react";
import { Country, State, City } from "country-state-city";
import { MultiSelectSearchableField } from "./multi-select-searchable-field";

export function LocationMultiFields({
  countryField,
  stateField,
  cityField,
  countryLabel = "Country",
  stateLabel = "State",
  cityLabel = "City",
  defaultCountries = [],
  defaultStates = [],
  defaultCities = [],
}: {
  countryField: string;
  stateField: string;
  cityField: string;
  countryLabel?: string;
  stateLabel?: string;
  cityLabel?: string;
  defaultCountries?: string[];
  defaultStates?: string[];
  defaultCities?: string[];
}) {
  const allCountries = useMemo(() => Country.getAllCountries(), []);

  const [countryNames, setCountryNames] = useState<string[]>(defaultCountries);
  const [stateNames, setStateNames] = useState<string[]>(defaultStates);
  const [cityNames, setCityNames] = useState<string[]>(defaultCities);

  const selectedCountryIsos = useMemo(
    () =>
      allCountries
        .filter((c) => countryNames.includes(c.name))
        .map((c) => c.isoCode),
    [allCountries, countryNames]
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
    if (selectedCountryIsos.length === 0 || stateNames.length === 0) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const iso of selectedCountryIsos) {
      for (const s of State.getStatesOfCountry(iso)) {
        if (!stateNames.includes(s.name)) continue;
        for (const city of City.getCitiesOfState(iso, s.isoCode)) {
          if (!seen.has(city.name)) {
            seen.add(city.name);
            result.push(city.name);
          }
        }
      }
    }
    return result.sort();
  }, [selectedCountryIsos, stateNames]);

  function handleCountryChange(next: string[]) {
    setCountryNames(next);
    // Drop states/cities that are no longer valid for the new country selection
    setStateNames((prev) => prev.filter((s) => availableStatesFor(next).includes(s)));
    setCityNames([]);
  }

  function availableStatesFor(countries: string[]) {
    const isos = allCountries.filter((c) => countries.includes(c.name)).map((c) => c.isoCode);
    const result = new Set<string>();
    for (const iso of isos) {
      for (const s of State.getStatesOfCountry(iso)) result.add(s.name);
    }
    return Array.from(result);
  }

  function handleStateChange(next: string[]) {
    setStateNames(next);
    setCityNames([]);
  }

  return (
    <>
      <MultiSelectSearchableField
        name={countryField}
        allowOpenToAll
        label={countryLabel}
        value={countryNames}
        onValueChange={handleCountryChange}
        options={allCountries.map((c) => c.name)}
        placeholder="Any country"
      />
      <MultiSelectSearchableField
        name={stateField}
        allowOpenToAll
        label={stateLabel}
        value={stateNames}
        onValueChange={handleStateChange}
        options={availableStates}
        placeholder={countryNames.includes(OPEN_TO_ALL) ? "Open to all countries" : selectedCountryIsos.length === 0 ? "Select country first" : "Any state"}
        disabled={selectedCountryIsos.length === 0}
      />
      <MultiSelectSearchableField
        name={cityField}
        allowOpenToAll
        label={cityLabel}
        value={cityNames}
        onValueChange={setCityNames}
        options={availableCities}
        placeholder={countryNames.includes(OPEN_TO_ALL) ? "Open to all countries" : stateNames.includes(OPEN_TO_ALL) ? "Open to all states" : stateNames.length === 0 ? "Select state first" : "Any city"}
        disabled={stateNames.length === 0}
      />
    </>
  );
}
