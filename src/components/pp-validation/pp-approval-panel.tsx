"use client";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PPQueueRow } from "@/lib/stats/pp-validation";
import {
  loadPPRequestForEditAction,
  approvePPValidationAction,
  requestPPRevisionAction,
} from "@/actions/pp-validation/pp-validation.actions";
import { createSmeSelfFollowUpAction } from "@/actions/sme/sme-follow-up.actions";
import { searchProfilesForPPValidationAction } from "@/actions/pp-validation/pp-validation-search.actions";
import {
  PPCriteriaFields,
  EMPTY_PP_CRITERIA,
  type PPCriteria,
  type RefOption,
} from "@/components/pp-validation/pp-criteria-fields";

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

type SearchResult = {
  total: number;
  profiles: Array<{ id: string; profileCode: string; name: string }>;
  page: number;
  pageSize: number;
  totalPages: number;
};

function RequestDetail({
  request,
  religions,
  castes,
  motherTongues,
  employees,
  onDone,
}: {
  request: PPQueueRow;
  religions: RefOption[];
  castes: RefOption[];
  motherTongues: RefOption[];
  employees: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [clientGender, setClientGender] = useState<"MALE" | "FEMALE" | "OTHER" | undefined>(undefined);
  const [criteria, setCriteria] = useState<PPCriteria>(EMPTY_PP_CRITERIA);
  const [notes, setNotes] = useState("");

  const [results, setResults] = useState<SearchResult | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  useState(() => {
    loadPPRequestForEditAction(request.id).then((data) => {
      if (data) {
        setClientGender(data.clientGender);
        setCriteria(data.criteria);
        setNotes(data.notes);
      }
      setLoading(false);
    });
    return null;
  });

  function handleSearch(page: number = 1) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await searchProfilesForPPValidationAction(
          {
            minAge: criteria.minAge,
            maxAge: criteria.maxAge,
            minHeight: criteria.minHeight,
            maxHeight: criteria.maxHeight,
            maritalStatusMulti: criteria.maritalStatusMulti,
            motherTongueIds: criteria.motherTongueIds,
            religionIds: criteria.religionIds,
            casteIds: criteria.casteIds,
            manglikStatusMulti: criteria.manglikStatusMulti,
            countryMulti: criteria.countryMulti,
            stateMulti: criteria.stateMulti,
            cityMulti: criteria.cityMulti,
            qualificationMulti: criteria.qualificationMulti,
            professionMulti: criteria.professionMulti,
            annualIncomeCurrency: criteria.annualIncomeCurrency,
            annualIncomeRanges: criteria.annualIncomeRanges,
            dietMulti: criteria.dietMulti,
            drinkingMulti: criteria.drinkingMulti,
            smokingMulti: criteria.smokingMulti,
            visaStatusMulti: criteria.visaStatusMulti,
          },
          page
        );
        setResults(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
      }
    });
  }

  function toggleCode(code: string) {
    setSelectedCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  function handleApprove() {
    setError(null);
    if (!assignedEmployeeId) return setError("Pick an RM to assign");
    if (!clientGender) return setError("Client gender is required before approval — ask Sales to add it");
    startTransition(async () => {
      try {
        await approvePPValidationAction({
          requestId: request.id,
          assignedEmployeeId,
          matchesFound: results?.total,
          matchedProfileCodes: selectedCodes,
          note: reviewNote || undefined,
          editedCriteria: criteria,
        });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Approve failed");
      }
    });
  }

  function handleRevision() {
    setError(null);
    if (!reviewNote.trim()) return setError("Write a note explaining what needs revision");
    startTransition(async () => {
      try {
        await requestPPRevisionAction(request.id, reviewNote);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to request revision");
      }
    });
  }

  function handleFollowUp() {
    setError(null);
    if (!followUpNote.trim()) return setError("Write a note for the follow-up");
    startTransition(async () => {
      try {
        await createSmeSelfFollowUpAction({
          note: `PP request follow-up — ${request.clientName} (${request.clientPhone}): ${followUpNote}`,
          followUpDate: followUpDate || null,
        });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to schedule follow-up");
      }
    });
  }

  if (loading) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Loading request…</p>;
  }

  return (
    <div className="space-y-4">
      {notes && (
        <div className="rounded-md border border-border bg-muted/50 p-3">
          <p className="text-xs font-semibold text-muted-foreground">SALES NOTES</p>
          <p className="whitespace-pre-wrap text-sm">{notes}</p>
        </div>
      )}

      <PPCriteriaFields
        value={criteria}
        onChange={setCriteria}
        religions={religions}
        castes={castes}
        motherTongues={motherTongues}
      />

      <div className="flex items-center gap-2">
        <Button onClick={() => handleSearch(1)} disabled={isPending}>
          {isPending ? "Searching…" : "Search matches"}
        </Button>
        {results && (
          <span className="text-sm text-muted-foreground">
            {results.total} match{results.total === 1 ? "" : "es"} found
          </span>
        )}
      </div>

      {results && (
        <div className="space-y-2">
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {results.profiles.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No profiles match.</p>
            )}
            {results.profiles.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={selectedCodes.includes(p.profileCode)}
                  onChange={() => toggleCode(p.profileCode)}
                />
                <span className="font-medium">{p.profileCode}</span>
                <span className="text-muted-foreground">{p.name}</span>
              </label>
            ))}
          </div>
          {results.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isPending || results.page <= 1}
                onClick={() => handleSearch(results.page - 1)}
              >
                Prev
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {results.page} of {results.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending || results.page >= results.totalPages}
                onClick={() => handleSearch(results.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={assignedEmployeeId} onValueChange={(v) => setAssignedEmployeeId(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Assign RM (required to approve)" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <textarea
        className={cn(fieldClass, "min-h-[80px]")}
        placeholder="Note (required for Needs Revision; optional for Approve)"
        value={reviewNote}
        onChange={(e) => setReviewNote(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleApprove} disabled={isPending}>
          {isPending ? "Working…" : "Approve"}
        </Button>
        <Button variant="outline" onClick={handleRevision} disabled={isPending}>
          Needs Revision
        </Button>
      </div>

      <div className="space-y-2 rounded-md border border-dashed border-border p-3">
        <p className="text-xs font-semibold text-muted-foreground">SCHEDULE FOLLOW-UP (self-reminder, does not change request status)</p>
        <textarea
          className={cn(fieldClass, "min-h-[60px]")}
          placeholder="What to follow up on"
          value={followUpNote}
          onChange={(e) => setFollowUpNote(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">When (optional)</label>
          <input
            type="datetime-local"
            className={cn(fieldClass, "w-auto")}
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
          <Button variant="outline" onClick={handleFollowUp} disabled={isPending}>
            Schedule Follow-up
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PPApprovalPanel({
  requests,
  religions,
  castes,
  motherTongues,
  employees,
}: {
  requests: PPQueueRow[];
  religions: RefOption[];
  castes: RefOption[];
  motherTongues: RefOption[];
  employees: { id: string; name: string }[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {requests.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No pending requests.</p>
      )}
      {requests.map((r) => (
        <Card key={r.id}>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
          >
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span>{r.clientName}</span>
              <span className="text-xs font-normal text-muted-foreground">{r.clientPhone}</span>
              {r.submittedByName && (
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-normal">
                  From {r.submittedByName}
                </span>
              )}
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {fmtDate(r.createdAt)}
              </span>
            </CardTitle>
            {r.packageDetails && (
              <p className="text-xs text-muted-foreground">{r.packageDetails}</p>
            )}
          </CardHeader>
          {expandedId === r.id && (
            <CardContent>
              <RequestDetail
                request={r}
                religions={religions}
                castes={castes}
                motherTongues={motherTongues}
                employees={employees}
                onDone={() => setExpandedId(null)}
              />
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
