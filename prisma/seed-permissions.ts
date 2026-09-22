// Run once (and any time you add a module to permission-modules.ts):
//   npx tsx prisma/seed-permissions.ts
//
// Safe to re-run — upserts on the (module, action) unique constraint,
// so it never duplicates rows or touches existing RolePermission /
// EmployeePermission grants.

import { PrismaClient } from "@prisma/client";
import { PERMISSION_MODULES } from "../src/lib/permissions/permission-modules";

const prisma = new PrismaClient();

async function main() {
  let created = 0;
  for (const { module, actions } of PERMISSION_MODULES) {
    for (const action of actions) {
      const result = await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: { module, action },
      });
      created++;
      void result;
    }
  }
  console.log(`Permission catalog synced: ${created} module/action rows checked.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
