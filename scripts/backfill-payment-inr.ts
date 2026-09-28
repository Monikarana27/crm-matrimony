import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const rateCache = new Map<string, number>();

async function rateFor(date: string): Promise<number> {
  const hit = rateCache.get(date);
  if (hit) return hit;
  const res = await fetch(`https://api.frankfurter.app/${date}?from=USD&to=INR`, {
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`rates API HTTP ${res.status} for ${date}`);
  const data = (await res.json()) as { rates?: { INR?: number } };
  const rate = data.rates?.INR;
  if (typeof rate !== "number" || rate < 50 || rate > 200) {
    throw new Error(`implausible rate for ${date}: ${JSON.stringify(data)}`);
  }
  rateCache.set(date, rate);
  return rate;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  console.log(APPLY ? "*** APPLY MODE ***" : "DRY RUN (no changes). Pass --apply to write.");

  const payments = await prisma.payment.findMany({
    where: { status: "PAID", amountInr: null },
    select: { id: true, amount: true, currency: true, paidAt: true, createdAt: true },
    orderBy: { paidAt: "asc" },
  });

  const inr = payments.filter((p) => p.currency === "INR");
  const usd = payments.filter((p) => p.currency === "USD");
  const other = payments.filter((p) => p.currency !== "INR" && p.currency !== "USD");
  console.log(`To process: ${inr.length} INR, ${usd.length} USD, ${other.length} other (skipped)`);

  for (const p of other) console.log("SKIP other currency:", p.id, p.currency, p.amount);

  if (APPLY) {
    for (const p of inr) {
      await prisma.payment.update({
        where: { id: p.id },
        data: { exchangeRate: 1, amountInr: round2(p.amount) },
      });
    }
    console.log(`INR: updated ${inr.length}`);
  }

  let usdSumUsd = 0;
  let usdSumInr = 0;
  for (const p of usd) {
    const when = p.paidAt ?? p.createdAt;
    const date = when.toISOString().slice(0, 10);
    const rate = await rateFor(date);
    const amountInr = round2(p.amount * rate);
    usdSumUsd += p.amount;
    usdSumInr += amountInr;

    const ach = await prisma.achievement.findUnique({
      where: { paymentId: p.id },
      select: { amount: true },
    });

    console.log(
      `${p.id}  ${date}  $${p.amount}  @${rate}  => ₹${amountInr}  | achievement: ${
        ach ? `₹${ach.amount} -> ₹${amountInr}` : "none"
      }`
    );

    if (APPLY) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: p.id },
          data: { exchangeRate: rate, amountInr },
        }),
        ...(ach
          ? [
              prisma.achievement.update({
                where: { paymentId: p.id },
                data: { amount: amountInr },
              }),
            ]
          : []),
      ]);
    }
  }
  console.log(`USD total: $${round2(usdSumUsd)} => ₹${round2(usdSumInr)}`);
}

main()
  .catch((e) => {
    console.error("FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
