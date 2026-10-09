"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Country, State, City } from "country-state-city";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { searchProfilesAction } from "@/actions/profile-shares/profile-share.actions";
import {
  MARITAL_STATUS_OPTIONS,
  MANGLIK_OPTIONS,
  INCOME_RANGES,
  OCCUPATION_OPTIONS,
  EDUCATION_FIELD_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  HEIGHT_OPTIONS_DATA,
} from "@/lib/constants/profile-options";
import { MultiSearchableSelectField } from "@/components/shared/multi-searchable-select-field";
import { SearchableSelectField } from "@/app/(dashboard)/dashboard/admin/profiles/tabs/searchable-select-field";

type Ref = { id: string; name: string };
type Result = {
  id: string;
  name: string;
  profileCode: string;
  gender: string;
  dob: Date | null;
  city: string | null;
  religion: { name: string } | null;
  caste: { name: string } | null;
};

function calcAge(dob: Date | null) {
  if (!dob) return "—";
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function citiesFor(keys: string[]): string[] {
  const names = keys.flatMap((k) => {
    const [c, s] = k.split(":");
    return City.getCitiesOfState(c, s).map((x) => x.name);
  });
  return Array.from(new Set(names));
}

export function ProfileSearchForm({
  religions,
  castes,
  motherTongues,
}: {
  religions: Ref[];
  castes: Ref[];
  motherTongues: Ref[];
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [isSearching, startSearch] = useTransition();
  const [searched, setSearched] = useState(false);
  const [religionIds, setReligionIds] = useState<string[]>([]);
  const [paidOnly, setPaidOnly] = useState(false);

  const [multi, setMulti] = useState<Record<string, string[]>>({});
  function setM(key: string, vals: string[]) {
    setMulti((m) => ({ ...m, [key]: vals }));
  }
  const [countryIsos, setCountryIsos] = useState<string[]>([]);
  const [stateKeys, setStateKeys] = useState<string[]>([]);
  const [cityNames, setCityNames] = useState<string[]>([]);
  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(
    () =>
      countryIsos.flatMap((iso) =>
        State.getStatesOfCountry(iso).map((s) => ({
          id: `${iso}:${s.isoCode}`,
          name: countryIsos.length > 1 ? `${s.name} (${iso})` : s.name,
        }))
      ),
    [countryIsos]
  );
  const cities = useMemo(() => citiesFor(stateKeys), [stateKeys]);

  function updateFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function handleCountryChange(isos: string[]) {
    setCountryIsos(isos);
    const keys = stateKeys.filter((k) => isos.includes(k.split(":")[0]));
    setStateKeys(keys);
    const valid = new Set(citiesFor(keys));
    setCityNames((c) => c.filter((n) => valid.has(n)));
  }

  function handleStateChange(keys: string[]) {
    setStateKeys(keys);
    const valid = new Set(citiesFor(keys));
    setCityNames((c) => c.filter((n) => valid.has(n)));
  }

  function search() {
    const arr = (k: string) => (multi[k] && multi[k].length > 0 ? multi[k] : undefined);
    startSearch(async () => {
      const data = await searchProfilesAction({
        search: filters.search || undefined,
        gender: (filters.gender as any) || undefined,
        minAge: filters.minAge ? parseInt(filters.minAge) : undefined,
        maxAge: filters.maxAge ? parseInt(filters.maxAge) : undefined,
        religionIds: religionIds.length > 0 ? religionIds : undefined,
        casteId: arr("casteId"),
        manglik: arr("manglik"),
        maritalStatus: arr("maritalStatus"),
        minHeightCm: filters.minHeightCm ? parseInt(filters.minHeightCm) : undefined,
        maxHeightCm: filters.maxHeightCm ? parseInt(filters.maxHeightCm) : undefined,
        motherTongueId: arr("motherTongueId"),
        country: countryIsos.length > 0 ? countryIsos.map((iso) => countries.find((c) => c.isoCode === iso)?.name ?? iso) : undefined,
        state: stateKeys.length > 0 ? stateKeys.map((k) => { const [c, s] = k.split(":"); return State.getStateByCodeAndCountry(s, c)?.name ?? s; }) : undefined,
        city: cityNames.length > 0 ? cityNames : undefined,
        annualIncome: arr("annualIncome"),
        educationField: arr("educationField"),
        highestQualification: arr("highestQualification"),
        profession: arr("profession"),
        paidOnly: paidOnly || undefined,
      });
      setResults(data as Result[]);
      setSearched(true);
    });
  }

  function reset() {
    setFilters({});
    setResults([]);
    setSearched(false);
    setMulti({});
    setCountryIsos([]);
    setStateKeys([]);
    setCityNames([]);
    setReligionIds([]);
    setPaidOnly(false);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-3">
          <Label>Search by ID or Name</Label>
          <Input
            value={filters.search ?? ""}
            onChange={(e) => updateFilter("search", e.target.value)}
            placeholder="e.g. EBMR32001 or Devam Raaj Vastav"
          />
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select value={filters.gender ?? ""} onValueChange={(v) => updateFilter("gender", v)}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Min Age</Label>
          <Input type="number" value={filters.minAge ?? ""} onChange={(e) => updateFilter("minAge", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Max Age</Label>
          <Input type="number" value={filters.maxAge ?? ""} onChange={(e) => updateFilter("maxAge", e.target.value)} />
        </div>
        <MultiSearchableSelectField
          name="maritalStatus"
          label="Marital Status"
          value={multi.maritalStatus ?? []}
          onValueChange={(v) => setM("maritalStatus", v)}
          options={MARITAL_STATUS_OPTIONS}
        />
        <div className="space-y-2">
          <Label>Min Height</Label>
          <Select value={filters.minHeightCm ?? ""} onValueChange={(v) => updateFilter("minHeightCm", v)}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              {HEIGHT_OPTIONS_DATA.map((o) => <SelectItem key={o.cm} value={String(o.cm)}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Max Height</Label>
          <Select value={filters.maxHeightCm ?? ""} onValueChange={(v) => updateFilter("maxHeightCm", v)}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              {HEIGHT_OPTIONS_DATA.map((o) => <SelectItem key={o.cm} value={String(o.cm)}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <MultiSearchableSelectField
          name="motherTongueId"
          label="Mother Tongue"
          value={multi.motherTongueId ?? []}
          onValueChange={(v) => setM("motherTongueId", v)}
          options={motherTongues}
        />
        <MultiSearchableSelectField
          name="religionIds"
          label="Religion"
          value={religionIds}
          onValueChange={setReligionIds}
          options={religions}
        />
        <MultiSearchableSelectField
          name="casteId"
          label="Caste"
          value={multi.casteId ?? []}
          onValueChange={(v) => setM("casteId", v)}
          options={castes}
        />
        <MultiSearchableSelectField
          name="manglik"
          label="Manglik"
          value={multi.manglik ?? []}
          onValueChange={(v) => setM("manglik", v)}
          options={MANGLIK_OPTIONS}
        />
        <MultiSearchableSelectField
          name="country"
          label="Country"
          value={countryIsos}
          onValueChange={handleCountryChange}
          options={countries.map((c) => ({ id: c.isoCode, name: c.name }))}
        />
        <MultiSearchableSelectField
          name="state"
          label="State"
          value={stateKeys}
          onValueChange={handleStateChange}
          options={states}
        />
        <MultiSearchableSelectField
          name="city"
          label="City"
          value={cityNames}
          onValueChange={setCityNames}
          options={cities}
        />
        <MultiSearchableSelectField
          name="annualIncome"
          label="Annual Income"
          value={multi.annualIncome ?? []}
          onValueChange={(v) => setM("annualIncome", v)}
          options={INCOME_RANGES}
        />
        <MultiSearchableSelectField
          name="profession"
          label="Profession"
          value={multi.profession ?? []}
          onValueChange={(v) => setM("profession", v)}
          options={OCCUPATION_OPTIONS}
        />
        <MultiSearchableSelectField
          name="educationField"
          label="Education Field"
          value={multi.educationField ?? []}
          onValueChange={(v) => setM("educationField", v)}
          options={EDUCATION_FIELD_OPTIONS}
        />
        <MultiSearchableSelectField
          name="highestQualification"
          label="Education Level"
          value={multi.highestQualification ?? []}
          onValueChange={(v) => setM("highestQualification", v)}
          options={EDUCATION_LEVEL_OPTIONS}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="paidOnly" checked={paidOnly} onCheckedChange={(v) => setPaidOnly(v === true)} />
        <Label htmlFor="paidOnly" className="cursor-pointer font-normal">Paid only</Label>
      </div>

      <div className="flex gap-2">
        <Button onClick={search} disabled={isSearching}>{isSearching ? "Searching..." : "Search"}</Button>
        <Button variant="outline" onClick={reset}>Reset</Button>
      </div>

      {searched && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No profiles match those filters.</p>
      )}

      {results.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {results.length === 50
              ? "Showing 50 results (capped at 50 — refine filters for more precise results)"
              : `Showing ${results.length} result${results.length === 1 ? "" : "s"}`}
          </p>
          <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">ID</th>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Age</th>
                <th className="p-3 font-medium">City</th>
                <th className="p-3 font-medium">Religion</th>
                <th className="p-3 font-medium">Caste</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3">
                    <Link href={`/dashboard/profile-search/${r.id}`} className="font-medium text-primary hover:underline">
                      {r.profileCode}
                    </Link>
                  </td>
                  <td className="p-3">
                    <Link href={`/dashboard/profile-search/${r.id}`} className="font-medium text-primary hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="p-3">{calcAge(r.dob)}</td>
                  <td className="p-3">{r.city ?? "—"}</td>
                  <td className="p-3">{r.religion?.name ?? "—"}</td>
                  <td className="p-3">{r.caste?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
