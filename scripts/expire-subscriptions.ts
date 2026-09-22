import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const result = await prisma.subscription.updateMany({
    where: {
      status: "ACTIVE",
      endDate: { not: null, lt: now },
    },
    data: { status: "EXPIRED" },
  });
  console.log(`[${new Date().toISOString()}] Marked ${result.count} subscriptions as EXPIRED.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
