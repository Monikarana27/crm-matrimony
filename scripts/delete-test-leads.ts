import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const TARGETS: Record<string, string> = {
  cmumccyso0235l3gfmnst04rd: "mr. random",
  cmumcbdbu022xl3gf68r53iq0: "Elite Bandhan",
  cmumc6w3l022dl3gfu76crhn2: "Elite Bandhan",
  cmumc5cms0229l3gfzluanhiw: "Monika",
  cmumbyyfo021hl3gf6iytiae5: "Monika",
  cmujofj8z0231l39laje9q9hv: "Shahina Sheikh",
};

async function main() {
  const ids = Object.keys(TARGETS);
  const rows: any[] = await prisma.lead.findMany({
    where: { id: { in: ids }, deletedAt: null },
  });

  const problems: string[] = [];
  for (const id of ids) {
    const r = rows.find((x) => x.id === id);
    if (!r) { problems.push(`${id}: not found or already deleted`); continue; }
    const name = (r.name ?? r.fullName ?? "").trim();
    if (name !== TARGETS[id]) problems.push(`${id}: name is "${name}", expected "${TARGETS[id]}"`);
    if (!String(r.source ?? "").startsWith("Website")) problems.push(`${id}: unexpected source "${r.source}"`);
  }
  if (problems.length) {
    console.log("ABORT, nothing changed:");
    problems.forEach((p) => console.log("  -", p));
    return;
  }

  console.table(rows.map((r) => ({ id: r.id, name: r.name ?? r.fullName, source: r.source, status: r.status })));

  if (!APPLY) {
    console.log(`DRY RUN: ${rows.length} leads would be soft-deleted. Re-run with --apply to delete.`);
    return;
  }

  const sys: any = await prisma.user.findFirst({ where: { role: "SYSTEM" as any } });
  const res = await prisma.lead.updateMany({
    where: { id: { in: ids }, deletedAt: null },
    data: { deletedAt: new Date(), deletedById: sys?.id ?? null } as any,
  });
  console.log(`Soft-deleted ${res.count} leads`);
}

main().finally(() => prisma.$disconnect());
