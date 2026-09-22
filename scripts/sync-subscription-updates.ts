import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import mysql from "mysql2/promise";
import fs from "fs";

const prisma = new PrismaClient();

const subscriptionIdMap: Record<string, string> = JSON.parse(fs.readFileSync("/root/subscription-id-map.json", "utf-8"));
const EXCLUDED_PAYMENT_LINK_IDS = new Set([254, 258]);

// Only re-check payment_links whose old row existed before this cutoff —
// anything migrated for the first time in today's catch-up run is fresh.
const CUTOFF = "2026-09-03 12:46:00";

const SERVICE_STATUS_MAP: Record<string, string> = {
  "Pending": "PENDING", "Active": "ACTIVE", "Hold": "HOLD",
  "Expired": "EXPIRED", "Stopped": "STOPPED", "Resumed": "ACTIVE", "Renewed": "ACTIVE",
};
const PAYMENT_STATUS_MAP: Record<string, string> = {
  "Pending": "PENDING", "Paid": "PAID", "Failed": "FAILED",
};

function toDate(val: any) {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}
function buildNotes(p: any) {
  const lines = ["[Migrated from old CRM]"];
  if (p.gateway === "razorpay") lines.push(`Original gateway: razorpay`);
  if (p.token) lines.push(`Old token: ${p.token}`);
  if (p.refund_status) {
    const parts = [`Refunded (${p.refund_type ?? "Unknown"}): ₹${Number(p.refund_amount ?? 0).toFixed(2)}`];
    if (p.refund_remarks) parts.push(`— ${p.refund_remarks}`);
    const processedAt = toDate(p.refund_processed_at);
    if (processedAt) parts.push(`— processed ${processedAt.toISOString().slice(0, 10)}`);
    lines.push(parts.join(" "));
  }
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

  const mappedIds = Object.keys(subscriptionIdMap).map(Number);
  if (mappedIds.length === 0) {
    console.log("No mapped subscriptions to check.");
    await mysqlConn.end();
    return;
  }

  const [candidates]: any = await mysqlConn.query(
    `SELECT * FROM payment_links WHERE id IN (${mappedIds.join(",")}) AND updated_at > ?`,
    [CUTOFF]
  );

  let updated = 0;
  let errors = 0;
  const updatedList: any[] = [];

  for (const p of candidates) {
    if (EXCLUDED_PAYMENT_LINK_IDS.has(p.id)) continue;
    const subId = subscriptionIdMap[p.id];
    if (!subId) continue;

    try {
      const status = SERVICE_STATUS_MAP[p.service_status ?? ""] ?? "PENDING";

      await prisma.subscription.update({
        where: { id: subId },
        data: {
          status: status as any,
          startDate: toDate(p.start_date) ?? new Date(),
          endDate: toDate(p.end_date),
          payments: {
            updateMany: {
              where: { subscriptionId: subId },
              data: {
                status: PAYMENT_STATUS_MAP[p.status ?? ""] ?? "PENDING",
                transactionId: p.transaction_id,
                paymentLinkUrl: p.payment_link,
                notes: buildNotes(p),
                paidAt: toDate(p.paid_at),
              },
            },
          },
        },
      });

      updated++;
      updatedList.push({ oldId: p.id, subscriptionId: subId, status });
    } catch (e) {
      errors++;
      console.error(`Error syncing payment_links id=${p.id}:`, e);
    }
  }

  console.log(`\nChecked ${candidates.length} candidate payment_links updated since ${CUTOFF}.`);
  console.log(`Synced ${updated} subscriptions. Errors: ${errors}.`);
  if (updatedList.length > 0) {
    console.log("\nUpdated subscriptions:");
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
