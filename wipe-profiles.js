const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    await prisma.payment.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.callLog.deleteMany({});
    await prisma.meeting.deleteMany({});
    await prisma.profileDocument.deleteMany({});
    await prisma.leadRemark.deleteMany({});
    await prisma.profileQueue.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.partnerPreference.deleteMany({});
    await prisma.profile.deleteMany({});
    console.log('Wiped all profile/lead/preference/subscription data. Users (employees) untouched.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
