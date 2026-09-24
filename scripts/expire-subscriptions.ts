import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// A subscription's endDate is stored as midnight IST of its last valid day
// (e.g. 24 Sep = valid through the whole 24th). It should only flip to
// EXPIRED once that day has fully passed — i.e. once "today" (IST) has
// moved to the 25th — not the instant midnight on the 24th itself arrives.
function startOfTodayIST(): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const startIstMs = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate());
  return new Date(startIstMs - IST_OFFSET_MS);
}

async function main() {
  const cutoff = startOfTodayIST();
  const result = await prisma.subscription.updateMany({
    where: {
      status: "ACTIVE",
      endDate: { not: null, lt: cutoff },
    },
    data: { status: "EXPIRED" },
  });
  console.log(`[${new Date().toISOString()}] Marked ${result.count} subscriptions as EXPIRED (cutoff ${cutoff.toISOString()}).`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
