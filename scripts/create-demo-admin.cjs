require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEMO_ADMIN_EMAIL;
  const password = process.env.DEMO_ADMIN_PASSWORD;

  if (!email || !password || password.length < 16) {
    throw new Error("Set DEMO_ADMIN_EMAIL and a password of at least 16 characters in .env.");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("Account already exists; nothing changed.");
    return;
  }

  await prisma.user.create({
    data: {
      name: "Demo Admin",
      email,
      password: await bcrypt.hash(password, 12),
      role: "ADMIN",
      active: true,
    },
  });

  console.log("Demo admin created.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
