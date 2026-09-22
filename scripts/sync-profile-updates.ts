import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import mysql from "mysql2/promise";
import fs from "fs";

const prisma = new PrismaClient();

const userIdMap: Record<string, string> = JSON.parse(fs.readFileSync("/root/user-id-map.json", "utf-8"));
const religionIdMap: Record<string, string> = JSON.parse(fs.readFileSync("/root/religion-id-map.json", "utf-8"));
const casteIdMap: Record<string, string> = JSON.parse(fs.readFileSync("/root/caste-id-map.json", "utf-8"));
const gotraNameMap: Record<string, string> = JSON.parse(fs.readFileSync("/root/gotra-name-map.json", "utf-8"));
const motherTongueNameMap: Record<string, string> = JSON.parse(fs.readFileSync("/root/mother-tongue-name-map.json", "utf-8"));

// Only re-check profiles whose old row existed before this cutoff — anything
// created for the first time in today's catch-up run is already fresh.
const CUTOFF = "2026-09-02 08:04:00";

function parseJsonArray(val: string | null): string[] {
  if (!val) return [];
  try {
    const arr = JSON.parse(val);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string" && x.length > 0) : [];
  } catch {
    return [];
  }
}
function flattenJsonArray(val) {
  const arr = parseJsonArray(val);
  if (arr.length === 0) return null;
  return [...new Set(arr)].join(", ");
}
function toFloat(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}
function toDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function main() {
  const mysqlConn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "TempMigration2026",
    database: "old_elitebandhan_crm_fresh",
  });

  const [sourceRows] = await mysqlConn.query<any[]>(`SELECT id, name FROM profile_sources`);
  const sourceMap: Record<number, string> = {};
  for (const s of sourceRows) sourceMap[s.id] = s.name;

  const [oldReligionRows] = await mysqlConn.query<any[]>(`SELECT id, name FROM religions`);
  const religionNameToNewId: Record<string, string> = {};
  for (const r of oldReligionRows) {
    const newId = religionIdMap[String(r.id)];
    if (newId) religionNameToNewId[r.name.toLowerCase()] = newId;
  }
  function resolveReligionId(raw: string | null): string | undefined {
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) return religionIdMap[trimmed];
    return religionNameToNewId[trimmed.toLowerCase()];
  }

  const [oldCommunityRows] = await mysqlConn.query<any[]>(`SELECT id, name FROM communities`);
  const casteNameToNewId: Record<string, string> = {};
  const casteNameAmbiguous = new Set<string>();
  for (const cRow of oldCommunityRows) {
    const newId = casteIdMap[String(cRow.id)];
    if (!newId) continue;
    const key = cRow.name.toLowerCase();
    if (key in casteNameToNewId && casteNameToNewId[key] !== newId) {
      casteNameAmbiguous.add(key);
    } else {
      casteNameToNewId[key] = newId;
    }
  }
  function resolveCasteId(raw: string | null): string | undefined {
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (trimmed === "") return undefined;
    if (/^\d+$/.test(trimmed)) return casteIdMap[trimmed];
    const key = trimmed.toLowerCase();
    if (casteNameAmbiguous.has(key)) return undefined;
    return casteNameToNewId[key];
  }

  const [assignRows] = await mysqlConn.query<any[]>(
    `SELECT profile_id, employee_id, expired_at FROM profile_employee_assignments WHERE ended_at IS NULL`
  );
  const assignByProfile: Record<number, { employee_id: number; expired: boolean }> = {};
  for (const a of assignRows) {
    assignByProfile[a.profile_id] = { employee_id: a.employee_id, expired: a.expired_at !== null };
  }

  const [candidates] = await mysqlConn.query<any[]>(
    `SELECT * FROM profiles WHERE updated_at > ?`,
    [CUTOFF]
  );

  let updated = 0;
  let skippedNotFound = 0;
  let errors = 0;
  const updatedList: any[] = [];

  for (const p of candidates) {
    try {
      let status: "UNASSIGNED" | "ASSIGNED" | "EXPIRED" = "UNASSIGNED";
      let assignedToId: string | undefined = undefined;
      const assignment = assignByProfile[p.id];
      if (assignment) {
        const mappedEmployee = userIdMap[String(assignment.employee_id)];
        if (mappedEmployee) {
          assignedToId = mappedEmployee;
          status = assignment.expired ? "EXPIRED" : "ASSIGNED";
        }
      }

      const deletedAt = p.status === "deleted" ? toDate(p.deleted_at) : null;
      const religionId = resolveReligionId(p.religion);
      const casteId = resolveCasteId(p.caste);
      const gotraId = p.gotra ? gotraNameMap[p.gotra] : undefined;
      const motherTongueId = p.mother_tongue ? motherTongueNameMap[p.mother_tongue] : undefined;

      const result = await prisma.profile.updateMany({
        where: { profileCode: p.profile_id },
        data: {
          source: sourceMap[p.profile_source_id] ?? null,
          sourceInfo: p.profile_source_comment,
          email: p.email,
          altEmail: p.alternative_email,
          phone: p.phone_number ?? "",
          altPhone: p.alternative_phone_number,
          contactPerson: p.contact_person_name,
          creatingFor: p.profile_for,
          name: p.name,
          gender: p.gender === "Male" ? "MALE" : "FEMALE",
          dob: toDate(p.date_of_birth),
          maritalStatus: p.marital_status,
          height: p.height,
          weightKg: toFloat(p.weight),
          motherTongueOld: p.mother_tongue,
          motherTongueId,
          bodyType: p.body_type,
          complexion: p.complexion,
          bloodGroup: p.blood_group,
          healthStatus: p.health_status,
          nativePlace: p.native_place,
          aboutYourself: p.bio,
          country: p.country,
          state: p.state,
          city: p.city,
          citizenship: p.citizenship,
          countryGrewUp: p.grow_up_in,
          visaStatus: p.visa_status,
          religionOld: p.religion,
          religionId,
          casteOld: p.caste,
          casteId,
          subCaste: p.sub_caste,
          gotraOld: p.gotra,
          gotraId,
          timeOfBirth: p.birth_time,
          placeOfBirth: p.birth_place,
          manglik: p.manglik_status,
          highestQualification: flattenJsonArray(p.highest_qualification),
          educationField: flattenJsonArray(p.education_field),
          institute: p.institute_name,
          workLocation: p.work_location,
          workingWith: p.employer_name,
          profession: flattenJsonArray(p.profession),
          businessName: p.business_name,
          designation: p.designation,
          annualIncome: p.annual_income,
          diet: p.diet,
          drinking: p.drinking_status,
          smoking: p.smoking_status,
          fatherOccupation: p.father_occupation,
          motherOccupation: p.mother_occupation,
          brothers: p.brother_count,
          brothersMarried: p.married_brother_count,
          sisters: p.sister_count,
          sistersMarried: p.married_sister_count,
          familyType: p.family_type,
          affluence: p.family_affluence,
          familyValues: p.family_values,
          familyBio: p.family_bio,
          familyAnnualIncome: p.family_annual_income,
          status,
          assignedToId,
          deletedAt,
        },
      });

      if (result.count === 0) {
        skippedNotFound++;
      } else {
        updated++;
        updatedList.push({ oldId: p.id, profileCode: p.profile_id, name: p.name });
      }
    } catch (e) {
      errors++;
      console.error(`Error syncing profile old_id=${p.id} (profile_id=${p.profile_id}):`, e);
    }
  }

  console.log(`\nChecked ${candidates.length} candidate profiles updated since ${CUTOFF}.`);
  console.log(`Synced ${updated} profiles. Not found (shouldn't happen): ${skippedNotFound}. Errors: ${errors}.`);
  if (updatedList.length > 0 && updatedList.length <= 50) {
    console.log("\nUpdated profiles:");
    console.table(updatedList);
  }

  await mysqlConn.end();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
