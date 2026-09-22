/**
 * src/lib/ai/embeddings.ts
 *
 * Helper for generating text embeddings via the locally-running Ollama
 * instance (127.0.0.1:11434, CPU-only) using the nomic-embed-text model.
 *
 * No paid API is used. This talks only to localhost.
 */

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const EMBED_MODEL = "nomic-embed-text";
const EMBED_DIMENSIONS = 768;

export class EmbeddingError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "EmbeddingError";
    this.cause = cause;
  }
}

/**
 * Generate a 768-dim embedding vector for the given text via Ollama.
 *
 * Throws EmbeddingError on any failure: unreachable Ollama, non-200
 * response, malformed JSON, or an unexpected vector shape.
 *
 * Callers where embedding failure must NOT block the caller's own
 * operation (e.g. saving a profile) should wrap calls to this in
 * try/catch and log-and-continue rather than letting it propagate.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new EmbeddingError("Cannot embed empty text");
  }

  let response: Response;
  try {
    response = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: trimmed,
      }),
      // Bound the request — an embedding call should never hang a
      // profile save or search request indefinitely.
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new EmbeddingError("Failed to reach Ollama", err);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new EmbeddingError(`Ollama returned HTTP ${response.status}: ${body}`);
  }

  let data: any;
  try {
    data = await response.json();
  } catch (err) {
    throw new EmbeddingError("Failed to parse Ollama response as JSON", err);
  }

  // /api/embed returns { embeddings: number[][] } — one vector per input.
  const vector = data?.embeddings?.[0];

  if (!Array.isArray(vector) || vector.length !== EMBED_DIMENSIONS) {
    throw new EmbeddingError(
      `Unexpected embedding shape from Ollama (got length ${vector?.length ?? "unknown"}, expected ${EMBED_DIMENSIONS})`
    );
  }

  return vector as number[];
}

/**
 * Format a JS number[] vector as a pgvector literal string, e.g. "[0.1,0.2,...]".
 * Use this when interpolating into raw SQL via $executeRaw / $queryRaw, e.g.:
 *
 *   await prisma.$executeRaw`
 *     UPDATE profiles SET embedding = ${toPgVectorLiteral(vector)}::vector
 *     WHERE id = ${profileId}
 *   `;
 */
export function toPgVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
