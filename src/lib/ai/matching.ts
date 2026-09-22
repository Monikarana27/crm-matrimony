/**
 * src/lib/ai/matching.ts
 *
 * Query functions built on the profiles.embedding column, powering:
 *   - getSimilarProfiles(profileId)  -> "Suggested Matches" on a profile's detail page
 *   - searchProfilesByText(query)    -> natural-language search page
 *
 * Both use pgvector's <=> (cosine distance) operator via $queryRaw, since
 * Prisma has no native vector-query support. Lower distance = more similar;
 * we convert to a 0-1 "similarity" score (1 - distance) for readability.
 */

import { Gender } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateEmbedding, toPgVectorLiteral, EmbeddingError } from "./embeddings";

export interface SimilarProfileResult {
  id: string;
  profileCode: string;
  name: string;
  gender: Gender;
  city: string | null;
  profession: string | null;
  similarity: number; // 0 (unrelated) to 1 (identical)
}

/**
 * Find profiles most similar to the given profile's embedding.
 *
 * Returns [] (rather than throwing) if the source profile has no embedding
 * yet — e.g. it was just created and the async embed hasn't landed, or
 * Ollama was down when it was saved. Callers should treat an empty result
 * as "no suggestions yet" rather than an error.
 */
export async function getSimilarProfiles(
  profileId: string,
  options: { limit?: number; excludeSameGender?: boolean } = {}
): Promise<SimilarProfileResult[]> {
  const limit = options.limit ?? 10;

  const source: { hasEmbedding: boolean; gender: Gender }[] = await prisma.$queryRaw`
    SELECT (embedding IS NOT NULL) AS "hasEmbedding", gender
    FROM profiles
    WHERE id = ${profileId}
  `;

  if (source.length === 0) {
    throw new Error(`Profile ${profileId} not found`);
  }

  if (!source[0].hasEmbedding) {
    console.warn(`getSimilarProfiles: profile ${profileId} has no embedding yet`);
    return [];
  }

  const genderFilter = options.excludeSameGender
    ? Object.values(Gender).filter((g) => g !== source[0].gender)
    : null;

  const rows: Array<{
    id: string;
    profileCode: string;
    name: string;
    gender: Gender;
    city: string | null;
    profession: string | null;
    distance: number;
  }> = genderFilter
    ? await prisma.$queryRaw`
        SELECT
          p2.id,
          p2."profileCode",
          p2.name,
          p2.gender,
          p2.city,
          p2.profession,
          (p1.embedding <=> p2.embedding) AS distance
        FROM profiles p1
        CROSS JOIN LATERAL (
          SELECT id, "profileCode", name, gender, city, profession, embedding
          FROM profiles
          WHERE id != ${profileId}
            AND embedding IS NOT NULL
            AND gender = ANY(${genderFilter}::"Gender"[])
        ) p2
        WHERE p1.id = ${profileId}
        ORDER BY distance ASC
        LIMIT ${limit}
      `
    : await prisma.$queryRaw`
        SELECT
          p2.id,
          p2."profileCode",
          p2.name,
          p2.gender,
          p2.city,
          p2.profession,
          (p1.embedding <=> p2.embedding) AS distance
        FROM profiles p1
        CROSS JOIN LATERAL (
          SELECT id, "profileCode", name, gender, city, profession, embedding
          FROM profiles
          WHERE id != ${profileId}
            AND embedding IS NOT NULL
        ) p2
        WHERE p1.id = ${profileId}
        ORDER BY distance ASC
        LIMIT ${limit}
      `;

  return rows.map((row) => ({
    id: row.id,
    profileCode: row.profileCode,
    name: row.name,
    gender: row.gender,
    city: row.city,
    profession: row.profession,
    similarity: 1 - row.distance,
  }));
}

/**
 * Free-text natural-language search, e.g.
 * "tall software engineer from Delhi, wants NRI groom".
 *
 * Embeds the query text with the same model used for profiles, then ranks
 * all profiles with an embedding by cosine distance to that query vector.
 *
 * Throws EmbeddingError if Ollama is unreachable/failing. Callers (the
 * search route/action) should catch this and show a "search is temporarily
 * unavailable" message rather than a silent empty result set.
 */
export async function searchProfilesByText(
  query: string,
  options: { limit?: number } = {}
): Promise<SimilarProfileResult[]> {
  const limit = options.limit ?? 25;

  const trimmed = query.trim();
  if (!trimmed) return [];

  const vector = await generateEmbedding(trimmed);
  const literal = toPgVectorLiteral(vector);

  const rows: Array<{
    id: string;
    profileCode: string;
    name: string;
    gender: Gender;
    city: string | null;
    profession: string | null;
    distance: number;
  }> = await prisma.$queryRaw`
    SELECT
      id,
      "profileCode",
      name,
      gender,
      city,
      profession,
      (embedding <=> ${literal}::vector) AS distance
    FROM profiles
    WHERE embedding IS NOT NULL
    ORDER BY distance ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    profileCode: row.profileCode,
    name: row.name,
    gender: row.gender,
    city: row.city,
    profession: row.profession,
    similarity: 1 - row.distance,
  }));
}

/**
 * Get cosine similarity (0-1) between a source profile's embedding and a
 * specific, already-filtered set of candidate profiles. Used to fold
 * semantic similarity into the rule-based scoreAndRank() weighting, rather
 * than as a standalone search — the candidate list is expected to already
 * come from hard filters (gender, approval status, etc.) upstream.
 *
 * Returns {} (not an error) if the source profile has no embedding yet —
 * callers should treat a missing entry in the map as "no similarity signal
 * available" and fall back to filter-only scoring for that call.
 */
export async function getEmbeddingSimilarities(
  profileId: string,
  candidateIds: string[]
): Promise<Record<string, number>> {
  if (candidateIds.length === 0) return {};

  const rows: Array<{ id: string; distance: number }> = await prisma.$queryRaw`
    SELECT p2.id, (p1.embedding <=> p2.embedding) AS distance
    FROM profiles p1
    CROSS JOIN LATERAL (
      SELECT id, embedding FROM profiles
      WHERE id = ANY(${candidateIds}::text[]) AND embedding IS NOT NULL
    ) p2
    WHERE p1.id = ${profileId} AND p1.embedding IS NOT NULL
  `;

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.id] = 1 - row.distance;
  }
  return result;
}
