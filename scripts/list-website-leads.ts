import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows: any[] = await prisma.lead.findMany({
    where: { deletedAt: null, source: { startsWith: "Website" } },
    orderBy: { createdAt: "desc" },
  });

  console.table(
    rows.map((r) => ({
      id: r.id,
      name: r.name ?? r.fullName ?? "",
      phone: r.phone ?? r.phoneNumber ?? r.mobile ?? "",
      source: r.source,
      status: r.status,
      assigned: r.assignedToId ?? "UNASSIGNED",
      created: r.createdAt?.toISOString?.().slice(0, 16),
    }))
  );
  console.log(`Total: ${rows.length}`);
}

main().finally(() => prisma.$disconnect());
