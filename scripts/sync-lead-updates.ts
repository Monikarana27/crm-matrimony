import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import mysql from "mysql2/promise";
import fs from "fs";

const prisma = new PrismaClient();

const userIdMap = JSON.parse(fs.readFileSync("/root/user-id-map.json", "utf-8"));
const profileIdMap = JSON.parse(fs.readFileSync("/root/profile-id-map.json", "utf-8"));
const leadIdMap = JSON.parse(fs.readFileSync("/root/lead-id-map.json", "utf-8"));

// Only re-check leads whose old row was migrated before this cutoff — anything
// migrated for the first time in today's catch-up run is already fresh.
const CUTOFF = "2026-09-03 06:17:00";

const DEPARTED_OR_INVALID_EMPLOYEE_IDS = new Set([82, 107]);

const STATUS_MAP = {
  "New": "NEW", "": "NEW", "Contacted": "CONTACTED",
  "Not Reachble/ No. Busy / Ringing": "CONTACTED", "Member Busy": "CONTACTED",
  "talking": "CONTACTED", "Product Pitch": "CONTACTED", "Follow Up": "PENDING",
  "P.T.P": "PENDING", "Pending": "PENDING", "Not Interested": "NOT_INTERESTED",
  "Opt. With Competitors": "NOT_INTERESTED", "Interested": "INTERESTED",
  "Converted": "CONVERTED", "Wrong No./ Fake Lead": "CLOSED", "No. Not Exist": "CLOSED",
};

const OLD_STATUS_LABEL = {
  "New": "New", "": "New", "Contacted": "Contacted", "talking": "Contacted",
  "Product Pitch": "Contacted", "Not Reachble/ No. Busy / Ringing": "Not Reachable/Busy",
  "Member Busy": "Not Reachable/Busy", "Follow Up": "Follow Up", "P.T.P": "Follow Up",
  "Pending": "Pending", "Not Interested": "Not Interested",
  "Opt. With Competitors": "Not Interested", "Interested": "Interested",
  "Converted": "Converted", "Wrong No./ Fake Lead": "Invalid/Fake Lead",
  "No. Not Exist": "Invalid/Fake Lead",
};

function toDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildNotes(l, createdByUnresolvedName) {
  const lines = ["[Migrated from old CRM]"];
  if (l.comment) lines.push(`Comment: ${l.comment}`);
  const oldLabel = OLD_STATUS_LABEL[l.status ?? ""] ?? l.status ?? "Unknown";
  lines.push(`Old Status: ${oldLabel}`);
  if (l.outcome) lines.push(`Outcome: ${l.outcome}`);
  if (l.closed_at) lines.push(`Closed at: ${toDate(l.closed_at)?.toISOString()}`);
  if (l.meta_lead_id) lines.push(`Meta Lead ID: ${l.meta_lead_id}`);
  if (l.meta_page_id) lines.push(`Meta Page ID: ${l.meta_page_id}`);
  if (l.meta_form_id) lines.push(`Meta Form ID: ${l.meta_form_id}`);
  if (l.meta_ad_id) lines.push(`Meta Ad ID: ${l.meta_ad_id}`);
  if (l.meta_campaign_id) lines.push(`Meta Campaign ID: ${l.meta_campaign_id}`);
  if (l.meta_platform) lines.push(`Meta Platform: ${l.meta_platform}`);
  if (createdByUnresolvedName) lines.push(`Created by (old, no longer employed): ${createdByUnresolvedName}`);
  lines.push(`[Synced update from old CRM: ${new Date().toISOString()}]`);
  return lines.join("\n");
}

async function main() {
  const mysqlConn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "TempMigration2026",
    database: "old_elitebandhan_crm_fresh",
  });

  const mappedIds = Object.keys(leadIdMap);
  if (mappedIds.length === 0) {
    console.log("No mapped leads to check.");
    await mysqlConn.end();
    return;
  }

  const [candidates] = await mysqlConn.query(
    `SELECT * FROM leads WHERE id IN (${mappedIds.join(",")}) AND updated_at > ?`,
    [CUTOFF]
  );

  let updated = 0;
  let errors = 0;
  const updatedList = [];

  for (const l of candidates) {
    const newId = leadIdMap[l.id];
    if (!newId) continue;
    try {
      const isDepartedAssignee = l.assigned_to && DEPARTED_OR_INVALID_EMPLOYEE_IDS.has(l.assigned_to);
      let status = STATUS_MAP[l.status ?? ""] ?? "NEW";
      let assignedToId = l.assigned_to ? userIdMap[String(l.assigned_to)] : undefined;

      if (isDepartedAssignee) {
        assignedToId = undefined;
        if (l.status !== "Converted") status = "NEW";
      }

      const convertedProfileId =
        l.status === "Converted" && l.profile_id ? profileIdMap[l.profile_id] : undefined;

      const createdById = l.created_by ? userIdMap[String(l.created_by)] : undefined;
      const createdByUnresolvedName = l.created_by && !createdById ? l.created_by_name : undefined;

      await prisma.lead.update({
        where: { id: newId },
        data: {
          name: l.name,
          phone: l.phone_number ?? "",
          email: l.email,
          source: l.source,
          status,
          notes: buildNotes(l, createdByUnresolvedName),
          followUpDate: toDate(l.follow_up),
          assignedToId,
          convertedProfileId,
        },
      });
      updated++;
      updatedList.push({ oldId: l.id, newId, name: l.name, status });
    } catch (e) {
      errors++;
      console.error(`Error syncing lead old_id=${l.id}:`, e);
    }
  }

  console.log(`\nChecked ${candidates.length} candidate leads updated since ${CUTOFF}.`);
  console.log(`Synced ${updated} leads. Errors: ${errors}.`);
  if (updatedList.length > 0) {
    console.log("\nUpdated leads:");
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
