import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const RETENTION_DAYS = 40;

async function main() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.loginEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  console.log(`[${new Date().toISOString()}] Deleted ${result.count} login events older than ${RETENTION_DAYS} days.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
