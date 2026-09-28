import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=INR", {
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`rates API HTTP ${res.status}`);
  const data = (await res.json()) as { date?: string; rates?: { INR?: number } };
  const rate = data.rates?.INR;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 50 || rate > 200) {
    throw new Error(`rejecting implausible rate: ${JSON.stringify(data)}`);
  }
  await prisma.systemSetting.upsert({
    where: { key: "usd_inr_rate" },
    update: { value: String(rate) },
    create: { key: "usd_inr_rate", value: String(rate) },
  });
  await prisma.systemSetting.upsert({
    where: { key: "usd_inr_rate_date" },
    update: { value: data.date ?? "" },
    create: { key: "usd_inr_rate_date", value: data.date ?? "" },
  });
  console.log(new Date().toISOString(), "saved usd_inr_rate", rate, "for", data.date);
}

main()
  .catch((e) => {
    console.error(new Date().toISOString(), "rate fetch failed, keeping last saved rate:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
