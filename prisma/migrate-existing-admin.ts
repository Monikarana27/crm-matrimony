import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
prisma.user.update({
  where: { email: "admin@elitebandhan.com" },
  data: { role: "SUPER_ADMIN" },
}).then(() => prisma.$disconnect());