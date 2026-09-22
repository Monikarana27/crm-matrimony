"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Country, State, City } from "country-state-city";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  searchProfilesAction,
  sendSelectedProfilesAction,
  getAlreadySharedProfileIdsAction,
} from "@/actions/profile-shares/profile-share.actions";
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

export function ProfileSearchForm({
  clientProfileId,
  clientEmail,
  religions,
  castes,
  motherTongues,
}: {
  clientProfileId: string;
  clientEmail: string;
  religions: Ref[];
  castes: Ref[];
  motherTongues: Ref[];
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [email, setEmail] = useState(clientEmail);
  const [isSearching, startSearch] = useTransition();
  const [isSending, startSending] = useTransition();
  const [sent, setSent] = useState<number | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [alreadySent, setAlreadySent] = useState<Set<string>>(new Set());
  const [skippedNote, setSkippedNote] = useState<string | null>(null);

  useEffect(() => {
    getAlreadySharedProfileIdsAction(clientProfileId).then((ids) => setAlreadySent(new Set(ids)));
  }, [clientProfileId]);

  const [countryIso, setCountryIso] = useState("");
  const [stateIso, setStateIso] = useState("");
  const [religionIds, setReligionIds] = useState<string[]>([]);
  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(
    () => (countryIso ? State.getStatesOfCountry(countryIso) : []),
    [countryIso]
  );
  const cities = useMemo(
    () => (countryIso && stateIso ? City.getCitiesOfState(countryIso, stateIso) : []),
    [countryIso, stateIso]
  );

  function updateFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function handleCountryChange(iso: string) {
    const c = countries.find((c) => c.isoCode === iso);
    setCountryIso(iso);
    setStateIso("");
    updateFilter("country", c?.name ?? "");
    updateFilter("state", "");
    updateFilter("city", "");
  }

  function handleStateChange(iso: string) {
    const s = states.find((s) => s.isoCode === iso);
    setStateIso(iso);
    updateFilter("state", s?.name ?? "");
    updateFilter("city", "");
  }

  function search() {
    startSearch(async () => {
      const data = await searchProfilesAction({
        search: filters.search || undefined,
        gender: (filters.gender as any) || undefined,
        minAge: filters.minAge ? parseInt(filters.minAge) : undefined,
        maxAge: filters.maxAge ? parseInt(filters.maxAge) : undefined,
        religionIds: religionIds.length > 0 ? religionIds : undefined,
        casteId: filters.casteId || undefined,
        manglik: filters.manglik || undefined,
        maritalStatus: filters.maritalStatus || undefined,
        minHeightCm: filters.minHeightCm ? parseInt(filters.minHeightCm) : undefined,
        maxHeightCm: filters.maxHeightCm ? parseInt(filters.maxHeightCm) : undefined,
        motherTongueId: filters.motherTongueId || undefined,
        country: filters.country || undefined,
        state: filters.state || undefined,
        city: filters.city || undefined,
        annualIncome: filters.annualIncome || undefined,
        educationField: filters.educationField || undefined,
        highestQualification: filters.highestQualification || undefined,
        profession: filters.profession || undefined,
      });
      setResults(data as Result[]);
      setSelected([]);
    });
  }

  function reset() {
    setFilters({});
    setResults([]);
    setCountryIso("");
    setStateIso("");
    setReligionIds([]);
  }

  function toggle(id: string) {
    if (alreadySent.has(id)) return;
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function send() {
    startSending(async () => {
      setSendError(null);
      setSkippedNote(null);
      const result = await sendSelectedProfilesAction(clientProfileId, email, selected);
      // Refresh the already-sent markers whatever happened (the page may have been stale).
      getAlreadySharedProfileIdsAction(clientProfileId).then((ids) => setAlreadySent(new Set(ids)));
      if (result.skippedNames && result.skippedNames.length > 0) {
        setSkippedNote(`Skipped (already sent earlier): ${result.skippedNames.join(", ")}`);
      }
      if (result.error) {
        setSendError(result.error);
        return;
      }
      setSelected([]);
      setSent(result.count);
    });
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
        <div className="space-y-2">
          <Label>Marital Status</Label>
          <Select value={filters.maritalStatus ?? ""} onValueChange={(v) => updateFilter("maritalStatus", v)}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              {MARITAL_STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
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
        <div className="space-y-2">
          <Label>Mother Tongue</Label>
          <Select value={filters.motherTongueId ?? ""} onValueChange={(v) => updateFilter("motherTongueId", v)}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              {motherTongues.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <MultiSearchableSelectField
          name="religionIds"
          label="Religion"
          value={religionIds}
          onValueChange={setReligionIds}
          options={religions}
        />
        <div className="space-y-2">
          <Label>Caste</Label>
          <Select value={filters.casteId ?? ""} onValueChange={(v) => updateFilter("casteId", v)}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              {castes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Manglik</Label>
          <Select value={filters.manglik ?? ""} onValueChange={(v) => updateFilter("manglik", v)}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              {MANGLIK_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Select value={countryIso} onValueChange={handleCountryChange}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              {countries.map((c) => <SelectItem key={c.isoCode} value={c.isoCode}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>State</Label>
          <Select value={stateIso} onValueChange={handleStateChange} disabled={!countryIso}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              {states.map((s) => <SelectItem key={s.isoCode} value={s.isoCode}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Select value={filters.city ?? ""} onValueChange={(v) => updateFilter("city", v)} disabled={!stateIso}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={`${c.name}-${c.latitude}-${c.longitude}`} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Annual Income</Label>
          <Select value={filters.annualIncome ?? ""} onValueChange={(v) => updateFilter("annualIncome", v)}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              {INCOME_RANGES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Profession</Label>
          <Select value={filters.profession ?? ""} onValueChange={(v) => updateFilter("profession", v)}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              {OCCUPATION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Education Field</Label>
          <Select value={filters.educationField ?? ""} onValueChange={(v) => updateFilter("educationField", v)}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              {EDUCATION_FIELD_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Education Level</Label>
          <Select value={filters.highestQualification ?? ""} onValueChange={(v) => updateFilter("highestQualification", v)}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              {EDUCATION_LEVEL_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={search} disabled={isSearching}>{isSearching ? "Searching..." : "Search"}</Button>
        <Button variant="outline" onClick={reset}>Reset</Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="p-3"></th>
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
                  <tr key={r.id} className={`border-b last:border-0 ${alreadySent.has(r.id) ? "bg-muted/40 opacity-60" : ""}`}>
                    <td className="p-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selected.includes(r.id)}
                        disabled={alreadySent.has(r.id)}
                        title={alreadySent.has(r.id) ? "Already sent to this client" : undefined}
                        onChange={() => toggle(r.id)}
                      />
                      {alreadySent.has(r.id) && <span className="ml-2 text-xs text-green-600">✓ Sent</span>}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/dashboard/admin/profiles/${r.id}`}
                        target="_blank"
                        className="text-primary hover:underline"
                      >
                        {r.profileCode}
                      </Link>
                    </td>
                    <td className="p-3 font-medium">
                      <Link
                        href={`/dashboard/admin/profiles/${r.id}`}
                        target="_blank"
                        className="text-primary hover:underline"
                      >
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

          <div className="flex items-center gap-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@email.com"
              className="w-64"
            />
            <Button disabled={isSending || selected.length === 0 || !email} onClick={send}>
              {isSending ? "Sending..." : sent !== null ? `Sent ✓ (${sent})` : `Send ${selected.length} Profiles`}
            </Button>
          </div>
          {sendError && (
            <p className="text-sm text-destructive">Failed to send: {sendError}</p>
          )}
          {skippedNote && <p className="text-sm text-muted-foreground">{skippedNote}</p>}
        </div>
      )}
    </div>
  );
}
