"use client";

// New component added to the EXISTING matching page. Does not modify or
// replace matching-results.tsx — renders alongside it. Fetches from the
// new /api/ai/match-suggestions route and shows either scored internal
// matches or a search brief, depending on what the API returns.

import { useState } from "react";
import Link from "next/link";

type InternalMatch = {
  profile: {
    id: string;
    profileCode: string;
    name: string;
    city: string | null;
    religion: string | null;
  };
  score: number;
  semanticSimilarity: number | null;
  reasoning: string;
  whatsappDraft: string;
};

type SearchBrief = {
  mustHave: { field: string; value: string }[];
  niceToHave: { field: string; value: string }[];
  exampleQueries: string[];
};

type ApiResponse =
  | { mode: "internal_matches"; matches: InternalMatch[] }
  | { mode: "search_brief"; brief: SearchBrief; internalMatchCount: number }
  | { error: string };

export default function AiSuggestions({ profileId }: { profileId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/match-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      const data: ApiResponse = await res.json();
      if ("error" in data) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("AI suggestions unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">AI Match Suggestions</h2>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-4 py-2 bg-rose-700 text-white rounded disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Suggestions"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-gray-500">
          AI suggestions unavailable right now — the rest of the page is unaffected. ({error})
        </p>
      )}

      {result && "mode" in result && result.mode === "internal_matches" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {result.matches.map((m) => (
            <div key={m.profile.id} className="border rounded p-4">
              <div className="flex justify-between items-start">
                <div>
                  <Link
                    href={`/dashboard/service/profiles/${m.profile.id}`}
                    className="font-medium text-rose-700 hover:underline"
                  >
                    {m.profile.name}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {m.profile.profileCode} · {m.profile.city ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-rose-700">{m.score}/100</span>
                  {m.semanticSimilarity !== null && (
                    <p className="text-xs text-gray-400">
                      {Math.round(m.semanticSimilarity * 100)}% semantic match
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm mt-2">{m.reasoning}</p>
              <div className="mt-3 bg-gray-50 border rounded p-2">
                <p className="text-xs text-gray-500 mb-1">WhatsApp draft</p>
                <p className="text-sm whitespace-pre-wrap">{m.whatsappDraft}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {result && "mode" in result && result.mode === "search_brief" && (
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600 mb-3">
            Only {result.internalMatchCount} internal matches found — here's a search brief for
            Shaadi.com / Jeevansathi.
          </p>
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">Must-have filters</p>
            {result.brief.mustHave.map((f, i) => (
              <p key={i} className="text-sm">
                {f.field}: {f.value}
              </p>
            ))}
          </div>
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">Nice-to-have filters</p>
            {result.brief.niceToHave.map((f, i) => (
              <p key={i} className="text-sm">
                {f.field}: {f.value}
              </p>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Example search queries</p>
            {result.brief.exampleQueries.map((q, i) => (
              <p key={i} className="text-sm font-mono bg-gray-50 border rounded px-2 py-1 mb-1">
                {q}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
