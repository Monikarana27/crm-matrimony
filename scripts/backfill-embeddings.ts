/**
 * scripts/backfill-embeddings.ts
 *
 * One-off backfill: generate embeddings for every profile that doesn't
 * have one yet, and write them via raw SQL (Prisma can't write to
 * Unsupported("vector") columns directly).
 *
 * Safe to re-run: only picks up profiles where embedding IS NULL, so if
 * this dies partway through (Ollama restart, SSH drop, etc.) just run it
 * again and it resumes where it left off.
 *
 * Run with:
 *   npx tsx scripts/backfill-embeddings.ts
 * or, if you don't have tsx installed:
 *   npx ts-node scripts/backfill-embeddings.ts
 */

import { PrismaClient } from "@prisma/client";
import { generateEmbedding, toPgVectorLiteral, EmbeddingError } from "../src/lib/ai/embeddings";
import { buildProfileEmbeddingText, ProfileForEmbedding } from "../src/lib/ai/profile-text";

const prisma = new PrismaClient();

// How often to print a progress line.
const LOG_EVERY = 50;

async function main() {
  console.log("Fetching profiles without an embedding...");

  // Raw SQL for the WHERE clause since `embedding` is an Unsupported type —
  // Prisma's query builder can't filter on it, but raw SQL can.
  const pending: { id: string }[] = await prisma.$queryRaw`
    SELECT id FROM profiles WHERE embedding IS NULL
  `;

  const total = pending.length;
  console.log(`${total} profile(s) need an embedding.`);

  if (total === 0) {
    console.log("Nothing to do.");
    return;
  }

  let succeeded = 0;
  let failed = 0;
  const failures: { id: string; error: string }[] = [];
  const startedAt = Date.now();

  for (let i = 0; i < total; i++) {
    const { id } = pending[i];

    try {
      // CONFIRM: adjust the include below to match your actual relation
      // names if this errors (e.g. the Profile <-> PartnerPreference
      // relation name wasn't confirmed from the schema dump).
      const profile = await prisma.profile.findUnique({
        where: { id },
        include: {
          religion: true,
          caste: true,
          gotra: true,
          motherTongueRef: true,
          partnerPreference: true,
        },
      });

      if (!profile) {
        console.warn(`  [skip] ${id} — profile not found (deleted mid-run?)`);
        continue;
      }

      const { partnerPreference, ...profileFields } = profile as any;

      const text = buildProfileEmbeddingText(
        profileFields as ProfileForEmbedding,
        partnerPreference
      );

      if (!text.trim()) {
        console.warn(`  [skip] ${id} — no text to embed (empty profile fields)`);
        continue;
      }

      const vector = await generateEmbedding(text);
      const literal = toPgVectorLiteral(vector);

      await prisma.$executeRaw`
        UPDATE profiles SET embedding = ${literal}::vector WHERE id = ${id}
      `;

      succeeded++;
    } catch (err) {
      failed++;
      const message = err instanceof EmbeddingError ? err.message : String(err);
      failures.push({ id, error: message });
      console.error(`  [fail] ${id} — ${message}`);
    }

    if ((i + 1) % LOG_EVERY === 0 || i + 1 === total) {
      const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`Progress: ${i + 1}/${total} (${succeeded} ok, ${failed} failed) — ${elapsedSec}s elapsed`);
    }
  }

  console.log("\n=== Backfill complete ===");
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed:    ${failed}`);

  if (failures.length > 0) {
    console.log("\nFailed profile IDs (re-run the script to retry these):");
    for (const f of failures) {
      console.log(`  ${f.id}: ${f.error}`);
    }
  }
}

main()
  .catch((err) => {
    console.error("Fatal error running backfill:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
