/**
 * normalize-partner-preferences.ts
 *
 * Second-pass backfill — companion to normalize-master-data.ts, which only
 * handled the Profile table. This does the identical relinking for
 * PartnerPreference.religionOld/casteOld/motherTongueOld, reusing (not
 * duplicating) whatever Religion/Caste/MotherTongueRef rows already exist
 * from the Profile backfill — so "Hindu" on a Profile and "Hindu" on a
 * PartnerPreference resolve to the exact same Religion row.
 *
 * Run AFTER normalize-master-data.ts, and BEFORE dropping any *Old columns.
 * Run with: npx tsx prisma/normalize-partner-preferences.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function cleanKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  return trimmed.length === 0 ? null : trimmed;
}

function displayCase(raw: string): string {
  return raw
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function main() {
  console.log("=== PartnerPreference normalization backfill ===");

  const prefs = await prisma.partnerPreference.findMany({
    select: {
      id: true,
      religionOld: true,
      casteOld: true,
      motherTongueOld: true,
    },
  });
  console.log(`Found ${prefs.length} partner preference rows to process.`);

  let updated = 0;
  let skipped = 0;
  let createdReligions = 0;
  let createdCastes = 0;
  let createdMotherTongues = 0;

  for (const pref of prefs) {
    const religionRaw = cleanKey(pref.religionOld);
    const casteRaw = cleanKey(pref.casteOld);
    const motherTongueRaw = cleanKey(pref.motherTongueOld);

    let religionId: string | null = null;
    let casteId: string | null = null;
    let motherTongueId: string | null = null;

    if (religionRaw) {
      const name = displayCase(religionRaw);
      const rec = await prisma.religion.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      religionId = rec.id;
    }

    if (motherTongueRaw) {
      const name = displayCase(motherTongueRaw);
      const rec = await prisma.motherTongueRef.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      motherTongueId = rec.id;
    }

    if (casteRaw) {
      const name = displayCase(casteRaw);
      // Caste is scoped under religionId (nullable) — find-or-create since
      // @@unique([name, religionId]) doesn't upsert cleanly with a nullable key
      let rec = await prisma.caste.findFirst({
        where: { name, religionId },
      });
      if (!rec) {
        rec = await prisma.caste.create({ data: { name, religionId } });
        createdCastes++;
      }
      casteId = rec.id;
    }

    if (!religionId && !casteId && !motherTongueId) {
      skipped++;
      continue;
    }

    await prisma.partnerPreference.update({
      where: { id: pref.id },
      data: {
        ...(religionId && { religionId }),
        ...(casteId && { casteId }),
        ...(motherTongueId && { motherTongueId }),
      },
    });
    updated++;
  }

  console.log(
    `Done. Relinked ${updated} partner preference rows, skipped ${skipped} with no matching data.`
  );

  console.log("\n--- SPOT CHECK: sample of 5 relinked partner preferences ---");
  const sample = await prisma.partnerPreference.findMany({
    take: 5,
    where: { religionId: { not: null } },
    select: {
      id: true,
      religionOld: true,
      religion: { select: { name: true } },
      casteOld: true,
      caste: { select: { name: true } },
      motherTongueOld: true,
      motherTongueRef: { select: { name: true } },
    },
  });
  console.log(sample);

  console.log(
    "\nReview the above. Once both this AND the earlier Profile backfill look correct, " +
    "it's safe to run the migration that drops the *Old columns."
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
