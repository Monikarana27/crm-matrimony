import { prisma } from "../src/lib/db/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const password = await bcrypt.hash(require("crypto").randomBytes(32).toString("hex"), 10);
  const user = await prisma.user.upsert({
    where: { email: "system@elitebandhan.internal" },
    update: {},
    create: {
      name: "System (Client Portal Bridge)",
      email: "system@elitebandhan.internal",
      password,
      role: "SYSTEM",
      active: false,
    },
  });
  console.log("SYSTEM user id:", user.id);
}

main().finally(() => prisma.$disconnect());
