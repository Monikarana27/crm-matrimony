import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const userIdMap: Record<string, string> = JSON.parse(fs.readFileSync('/root/user-id-map.json', 'utf-8'));

async function main() {
  const oldEmployeeToUser: Record<string, string> = { "35": "51" }; // emp_35 -> old user_id 51
  const files = fs.readdirSync('/var/www/elite_bandhan_crm/public/uploads/employee_docs');

  let migrated = 0, skipped = 0;
  for (const file of files) {
    const match = file.match(/^emp_(\d+)_\d+\./);
    if (!match) { skipped++; console.log(`SKIP (no id): ${file}`); continue; }
    const oldEmpId = match[1];
    const oldUserId = oldEmployeeToUser[oldEmpId];
    if (!oldUserId || !userIdMap[oldUserId]) { skipped++; console.log(`SKIP (unresolvable): ${file}`); continue; }

    await prisma.employeeDocument.create({
      data: {
        userId: userIdMap[oldUserId],
        url: `/uploads/employee_docs/${file}`,
      },
    });
    migrated++;
    console.log(`Migrated: ${file} -> user ${userIdMap[oldUserId]}`);
  }
  console.log(`Done. Migrated: ${migrated}. Skipped: ${skipped}.`);
}

main().finally(() => prisma.$disconnect());
