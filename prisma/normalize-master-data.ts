/**
 * normalize-master-data.ts
 *
 * One-time backfill script: reads existing free-text values from
 * Profile.religion / caste / gotra / motherTongue, creates deduped
 * lookup rows in Religion / Caste / Gotra / MotherTongueRef, and
 * relinks each Profile to the new *Id foreign keys.
 *
 * SAFE ORDER OF OPERATIONS:
 * 1. Add the NEW nullable columns (religionId, casteId, gotraId, motherTongueId)
 *    via `prisma migrate dev` WITHOUT removing the old string columns yet.
 * 2. Run this script: npx tsx prisma/normalize-master-data.ts
 * 3. Manually spot-check a sample of profiles (query below prints a summary).
 * 4. Only after verifying, do a second migration that drops the old
 *    religion/caste/gotra/motherTongue string columns.
 *
 * This mirrors how Elite's data is structured (Religion -> Caste via religionId,
 * Gotra and MotherTongue flat) — see 01-schema-additions.prisma for the schema.
 *
 * Run with: npx tsx prisma/normalize-master-data.ts
 * (or `node --loader ts-node/esm prisma/normalize-master-data.ts` depending on your setup)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Normalize a raw string for matching: trim, collapse whitespace, title-case comparison key. */
function cleanKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return null;
  return trimmed;
}

/** Display-case a name for storage (e.g. "brahmin" -> "Brahmin"). Adjust if you want to preserve original casing instead. */
function displayCase(raw: string): string {
  return raw
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function main() {
  console.log("=== Master data normalization backfill ===");

  // NOTE: field names below assume STEP A has been applied — the old string
  // columns are now religionOld/casteOld/gotraOld/motherTongueOld.
  const profiles = await prisma.profile.findMany({
    select: {
      id: true,
      religionOld: true,
      casteOld: true,
      gotraOld: true,
      motherTongueOld: true,
    },
  });
  console.log(`Found ${profiles.length} profiles to process.`);

  // --- Pass 1: collect distinct values per field ---
  const religionNames = new Set<string>();
  const gotraNames = new Set<string>();
  const motherTongueNames = new Set<string>();
  // caste needs to be paired with religion since Caste is scoped under Religion
  const casteNamesByReligion = new Map<string, Set<string>>(); // key: religion display name (or "__NONE__")

  for (const p of profiles) {
    const religion = cleanKey(p.religionOld);
    const caste = cleanKey(p.casteOld);
    const gotra = cleanKey(p.gotraOld);
    const motherTongue = cleanKey(p.motherTongueOld);

    if (religion) religionNames.add(displayCase(religion));
    if (gotra) gotraNames.add(displayCase(gotra));
    if (motherTongue) motherTongueNames.add(displayCase(motherTongue));

    if (caste) {
      const religionKey = religion ? displayCase(religion) : "__NONE__";
      if (!casteNamesByReligion.has(religionKey)) {
        casteNamesByReligion.set(religionKey, new Set());
      }
      casteNamesByReligion.get(religionKey)!.add(displayCase(caste));
    }
  }

  console.log(
    `Distinct: religions=${religionNames.size}, gotras=${gotraNames.size}, motherTongues=${motherTongueNames.size}, caste-groups=${casteNamesByReligion.size}`
  );

  // --- Pass 2: upsert lookup rows ---
  const religionIdByName = new Map<string, string>();
  for (const name of religionNames) {
    const rec = await prisma.religion.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    religionIdByName.set(name, rec.id);
  }

  const gotraIdByName = new Map<string, string>();
  for (const name of gotraNames) {
    const rec = await prisma.gotra.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    gotraIdByName.set(name, rec.id);
  }

  const motherTongueIdByName = new Map<string, string>();
  for (const name of motherTongueNames) {
    const rec = await prisma.motherTongueRef.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    motherTongueIdByName.set(name, rec.id);
  }

  // caste is unique on [name, religionId] — handle the "no religion" bucket with religionId: null
  const casteIdByReligionAndName = new Map<string, string>(); // key: `${religionKey}::${casteName}`
  for (const [religionKey, casteSet] of casteNamesByReligion) {
    const religionId =
      religionKey === "__NONE__" ? null : religionIdByName.get(religionKey) ?? null;

    for (const casteName of casteSet) {
      // findFirst + create because @@unique([name, religionId]) doesn't support
      // upsert cleanly when religionId can be null in some Prisma versions
      let rec = await prisma.caste.findFirst({
        where: { name: casteName, religionId },
      });
      if (!rec) {
        rec = await prisma.caste.create({
          data: { name: casteName, religionId },
        });
      }
      casteIdByReligionAndName.set(`${religionKey}::${casteName}`, rec.id);
    }
  }

  console.log("Lookup tables populated. Relinking profiles...");

  // --- Pass 3: relink each profile ---
  let updated = 0;
  let skipped = 0;
  for (const p of profiles) {
    const religion = cleanKey(p.religionOld);
    const caste = cleanKey(p.casteOld);
    const gotra = cleanKey(p.gotraOld);
    const motherTongue = cleanKey(p.motherTongueOld);

    const religionDisplay = religion ? displayCase(religion) : null;
    const gotraDisplay = gotra ? displayCase(gotra) : null;
    const motherTongueDisplay = motherTongue ? displayCase(motherTongue) : null;

    const religionId = religionDisplay ? religionIdByName.get(religionDisplay) ?? null : null;
    const gotraId = gotraDisplay ? gotraIdByName.get(gotraDisplay) ?? null : null;
    const motherTongueId = motherTongueDisplay
      ? motherTongueIdByName.get(motherTongueDisplay) ?? null
      : null;

    let casteId: string | null = null;
    if (caste) {
      const religionKey = religionDisplay ?? "__NONE__";
      casteId = casteIdByReligionAndName.get(`${religionKey}::${displayCase(caste)}`) ?? null;
    }

    if (!religionId && !casteId && !gotraId && !motherTongueId) {
      skipped++;
      continue;
    }

    await prisma.profile.update({
      where: { id: p.id },
      data: {
        ...(religionId && { religionId }),
        ...(casteId && { casteId }),
        ...(gotraId && { gotraId }),
        ...(motherTongueId && { motherTongueId }),
      },
    });
    updated++;
  }

  console.log(`Done. Relinked ${updated} profiles, skipped ${skipped} with no matching data.`);
  console.log("\n--- SPOT CHECK: sample of 5 relinked profiles ---");
  const sample = await prisma.profile.findMany({
    take: 5,
    where: { religionId: { not: null } },
    select: {
      id: true,
      name: true,
      religionOld: true, // old string, still present until STEP B drops it
      religion: { select: { name: true } }, // new normalized relation
    },
  });
  console.log(sample);

  console.log(
    "\nReview the above, then run a second `prisma migrate dev` to drop the old string columns once satisfied."
  );
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
