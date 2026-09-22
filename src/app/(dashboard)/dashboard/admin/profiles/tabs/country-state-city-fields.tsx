"use client";
import { useMemo, useState } from "react";
import { Country, State, City } from "country-state-city";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "./searchable-combobox";

export function CountryStateCityFields({
  countryField,
  stateField,
  cityField,
  countryLabel = "Country",
  stateLabel = "State",
  cityLabel = "City",
  defaultCountry,
  defaultState,
  defaultCity,
}: {
  countryField: string;
  stateField: string;
  cityField: string;
  countryLabel?: string;
  stateLabel?: string;
  cityLabel?: string;
  defaultCountry?: string;
  defaultState?: string;
  defaultCity?: string;
}) {
  const countries = useMemo(() => Country.getAllCountries(), []);
  const initialCountry = useMemo(
    () => countries.find((c) => c.name === defaultCountry),
    [countries, defaultCountry]
  );

  const [countryIso, setCountryIso] = useState(initialCountry?.isoCode ?? "");
  const [countryName, setCountryName] = useState(defaultCountry ?? "");

  const states = useMemo(
    () => (countryIso ? State.getStatesOfCountry(countryIso) : []),
    [countryIso]
  );
  const initialState = useMemo(
    () => states.find((s) => s.name === defaultState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [states.length]
  );

  const [stateIso, setStateIso] = useState(initialState?.isoCode ?? "");
  const [stateName, setStateName] = useState(defaultState ?? "");

  const cities = useMemo(
    () => (countryIso && stateIso ? City.getCitiesOfState(countryIso, stateIso) : []),
    [countryIso, stateIso]
  );

  const [cityName, setCityName] = useState(defaultCity ?? "");

  function handleCountryChange(iso: string) {
    const c = countries.find((c) => c.isoCode === iso);
    setCountryIso(iso);
    setCountryName(c?.name ?? "");
    setStateIso("");
    setStateName("");
    setCityName("");
  }

  function handleStateChange(iso: string) {
    const s = states.find((s) => s.isoCode === iso);
    setStateIso(iso);
    setStateName(s?.name ?? "");
    setCityName("");
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={countryField}>{countryLabel}</Label>
        <SearchableCombobox
          id={countryField}
          value={countryIso}
          onValueChange={handleCountryChange}
          options={countries.map((c) => ({ value: c.isoCode, label: c.name }))}
          placeholder="Select country..."
          searchPlaceholder="Search country..."
        />
        <input type="hidden" name={countryField} value={countryName} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={stateField}>{stateLabel}</Label>
        <SearchableCombobox
          id={stateField}
          value={stateIso}
          onValueChange={handleStateChange}
          options={states.map((s) => ({ value: s.isoCode, label: s.name }))}
          placeholder="Select state..."
          searchPlaceholder="Search state..."
          disabled={!countryIso}
        />
        <input type="hidden" name={stateField} value={stateName} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={cityField}>{cityLabel}</Label>
        <SearchableCombobox
          id={cityField}
          value={cityName}
          onValueChange={setCityName}
          options={cities.map((city) => ({ value: city.name, label: city.name }))}
          placeholder="Select city..."
          searchPlaceholder="Search city..."
          disabled={!stateIso}
        />
        <input type="hidden" name={cityField} value={cityName} />
      </div>
    </>
  );
}
