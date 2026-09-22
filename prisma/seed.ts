import { PrismaClient, Role, Department } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// --- Single shared password for ALL seeded users (admin, sales, service, employees) ---
// Change this one value if you want a different password across the board.
const SHARED_PASSWORD = "Elite@123";

async function main() {
  const hashedPassword = await bcrypt.hash(SHARED_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: "admin@elitebandhan.com" },
    update: { password: hashedPassword },
    create: {
      name: "Super Admin",
      email: "admin@elitebandhan.com",
      password: hashedPassword,
      role: Role.ADMIN,
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "sales@elitebandhan.com" },
    update: { password: hashedPassword },
    create: {
      name: "Sales Executive",
      email: "sales@elitebandhan.com",
      password: hashedPassword,
      role: Role.SALES,
      department: Department.SALES_EMP,
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "service@elitebandhan.com" },
    update: { password: hashedPassword },
    create: {
      name: "Service Executive",
      email: "service@elitebandhan.com",
      password: hashedPassword,
      role: Role.SERVICE,
      department: Department.SERVICE_EMP,
      active: true,
    },
  });

  // --- Real employees ---
  const employees = [
    {
      name: "Maya Verma",
      email: "maya.verma@elitebandhan.com",
      role: Role.SERVICE,
      department: Department.SERVICE_EMP,
    },
    {
      name: "Ritika Singh",
      email: "ritika@elitebandhan.com",
      role: Role.SERVICE,
      department: Department.SERVICE_EMP,
    },
    {
      name: "Chandeep Kaur",
      email: "Chandeep.kaur@elitebandhan.com",
      role: Role.SERVICE,
      department: Department.SERVICE_EMP,
    },
    {
      name: "Madhu bala",
      email: "madhubala.elitebandhan@gmail.com",
      role: Role.SERVICE,
      department: Department.SERVICE_EMP,
    },
    {
      name: "Devendra Singh",
      email: "devendra.singh@elitebandhan.com",
      role: Role.SERVICE_MANAGER,
      department: Department.SERVICE_EMP,
    },
    {
      name: "Vinita Sharma",
      email: "vinita.elitebandhan@gmail.com",
      role: Role.SALES,
      department: Department.SALES_EMP,
    },
    {
      name: "Preeti Arya",
      email: "preetiarya.elitebandhan@gmail.com",
      role: Role.SALES,
      department: Department.SALES_EMP,
    },
    {
      name: "Sushil Kumar Kumar",
      email: "Sushil.elitebandhan@gmail.com",
      role: Role.SALES,
      department: Department.SALES_EMP,
    },
    {
      name: "Kunal Kunal",
      email: "Kunal.elitebandhan@gmail.com",
      role: Role.PROFILE_CREATOR,
      department: Department.PROFILE_EMP,
    },
    {
      name: "Pallavi Sharma",
      email: "pallavi.sharma@elitebandhan.com",
      role: Role.SALES_MANAGER,
      department: Department.SALES_EMP,
    },
    {
      name: "Shayina Sheikh",
      email: "shayina.sheikh@elitebandhan.com",
      role: Role.SERVICE_MANAGER,
      department: Department.SERVICE_EMP,
    },
  ];

  for (const emp of employees) {
    await prisma.user.upsert({
      where: { email: emp.email },
      update: {
        department: emp.department,
        role: emp.role,
        password: hashedPassword,
        active: true,
      },
      create: {
        name: emp.name,
        email: emp.email,
        password: hashedPassword,
        role: emp.role,
        department: emp.department,
        active: true,
      },
    });
  }

  // --- Remove old/unwanted employees not in this list ---
  const keepEmails = [
    "admin@elitebandhan.com",
    "sales@elitebandhan.com",
    "service@elitebandhan.com",
    ...employees.map((e) => e.email),
  ];

  const oldUsers = await prisma.user.findMany({
    where: { email: { notIn: keepEmails } },
    select: { id: true, email: true },
  });
  const oldUserIds = oldUsers.map((u) => u.id);

  if (oldUserIds.length > 0) {
    const adminUser = await prisma.user.findUniqueOrThrow({
      where: { email: "admin@elitebandhan.com" },
      select: { id: true },
    });
    const adminId = adminUser.id;

    // Optional FKs — reassign so leads/profiles/meetings don't go unassigned
    await prisma.profile.updateMany({ where: { assignedToId: { in: oldUserIds } }, data: { assignedToId: adminId } });
    await prisma.lead.updateMany({ where: { assignedToId: { in: oldUserIds } }, data: { assignedToId: adminId } });
    await prisma.meeting.updateMany({ where: { assignedToId: { in: oldUserIds } }, data: { assignedToId: adminId } });
    await prisma.callLog.updateMany({ where: { createdById: { in: oldUserIds } }, data: { createdById: adminId } });
    await prisma.profileQueue.updateMany({ where: { sentById: { in: oldUserIds } }, data: { sentById: adminId } });

    // Required FKs (Restrict) — must reassign or the delete below will fail
    await prisma.leadRemark.updateMany({ where: { actorId: { in: oldUserIds } }, data: { actorId: adminId } });
    await prisma.workspaceMessage.updateMany({ where: { authorId: { in: oldUserIds } }, data: { authorId: adminId } });
    await prisma.workspaceMention.updateMany({ where: { mentionedUserId: { in: oldUserIds } }, data: { mentionedUserId: adminId } });
    await prisma.leadAssignmentHistory.updateMany({ where: { changedById: { in: oldUserIds } }, data: { changedById: adminId } });
    await prisma.leadAssignmentHistory.updateMany({ where: { fromEmployeeId: { in: oldUserIds } }, data: { fromEmployeeId: adminId } });
    await prisma.leadAssignmentHistory.updateMany({ where: { toEmployeeId: { in: oldUserIds } }, data: { toEmployeeId: adminId } });

    // Required FKs (Cascade) — these are per-employee personal history
    // (attendance, payroll, etc). Deleting the user cascades them anyway,
    // so we delete explicitly here for clarity/logging.
    await prisma.salesTarget.deleteMany({ where: { userId: { in: oldUserIds } } });
    await prisma.attendance.deleteMany({ where: { userId: { in: oldUserIds } } });
    await prisma.payroll.deleteMany({ where: { userId: { in: oldUserIds } } });
    await prisma.leaveRequest.deleteMany({ where: { userId: { in: oldUserIds } } });
    await prisma.performanceReview.deleteMany({ where: { userId: { in: oldUserIds } } });
    await prisma.loginEvent.deleteMany({ where: { userId: { in: oldUserIds } } });
    await prisma.activityLog.deleteMany({ where: { actorId: { in: oldUserIds } } });
    // Notification.recipientId/actorId are Cascade/SetNull — handled automatically on delete
  }

  const deleted = await prisma.user.deleteMany({
    where: { email: { notIn: keepEmails } },
  });

  console.log("Seed completed:");
  console.log(`  All seeded users now share the password: ${SHARED_PASSWORD}`);
  console.log("  admin@elitebandhan.com   (ADMIN)");
  console.log("  sales@elitebandhan.com   (SALES)");
  console.log("  service@elitebandhan.com (SERVICE)");
  console.log("  11 real employees seeded (SERVICE / SALES / PROFILE_CREATOR / SALES_MANAGER / SERVICE_MANAGER)");
  console.log(`  Removed ${deleted.count} old user(s); their leads/profiles/meetings reassigned to admin`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });