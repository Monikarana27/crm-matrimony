"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";

async function requireHR() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "HR"].includes(session.user.role)) throw new Error("Unauthorized");
  return session;
}

// Attendance
export async function checkInAction(userId: string) {
  await requireHR();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  await prisma.attendance.upsert({
    where: { userId_date: { userId, date: today } },
    update: { checkIn: new Date(), status: "PRESENT" },
    create: { userId, date: today, checkIn: new Date(), status: "PRESENT" },
  });
  revalidatePath("/dashboard/hr/attendance");
}

export async function getAttendanceForDate(date: Date) {
  await requireHR();
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  return prisma.attendance.findMany({ where: { date: d }, include: { user: { select: { name: true } } } });
}

// Leave
export async function requestLeaveAction(userId: string, startDate: string, endDate: string, reason: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  await prisma.leaveRequest.create({ data: { userId, startDate: new Date(startDate), endDate: new Date(endDate), reason } });
  revalidatePath("/dashboard/hr/leave");
}

export async function reviewLeaveAction(id: string, status: "APPROVED" | "REJECTED") {
  await requireHR();
  await prisma.leaveRequest.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/hr/leave");
}

export async function getLeaveRequests() {
  await requireHR();
  return prisma.leaveRequest.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } });
}

// Recruitment
export async function createJobOpeningAction(title: string, department: string, description: string) {
  await requireHR();
  await prisma.jobOpening.create({ data: { title, department: department as any, description } });
  revalidatePath("/dashboard/hr/recruitment");
}

export async function getJobOpenings() {
  await requireHR();
  return prisma.jobOpening.findMany({ where: { active: true }, include: { interviews: true }, orderBy: { createdAt: "desc" } });
}

export async function scheduleInterviewAction(jobOpeningId: string, candidateName: string, candidatePhone: string, scheduledAt: string) {
  await requireHR();
  await prisma.interview.create({ data: { jobOpeningId, candidateName, candidatePhone, scheduledAt: new Date(scheduledAt) } });
  revalidatePath("/dashboard/hr/recruitment");
}

export async function updateInterviewStatusAction(id: string, status: "SCHEDULED" | "COMPLETED" | "REJECTED" | "HIRED") {
  await requireHR();
  await prisma.interview.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/hr/recruitment");
}

// Performance
export async function addPerformanceReviewAction(userId: string, rating: number, comments: string) {
  const session = await requireHR();
  await prisma.performanceReview.create({ data: { userId, rating, comments, reviewedById: session.user.id } });
  revalidatePath("/dashboard/hr/performance");
}

export async function getPerformanceReviews(userId?: string) {
  await requireHR();
  return prisma.performanceReview.findMany({
    where: userId ? { userId } : {},
    orderBy: { reviewDate: "desc" },
    include: { user: { select: { name: true } } },
  });
}

// Payroll
export async function setPayrollAction(userId: string, month: number, year: number, baseSalary: number, incentive: number) {
  await requireHR();
  await prisma.payroll.upsert({
    where: { userId_month_year: { userId, month, year } },
    update: { baseSalary, incentive },
    create: { userId, month, year, baseSalary, incentive },
  });
  revalidatePath("/dashboard/hr/payroll");
}

export async function markPayrollPaidAction(id: string) {
  await requireHR();
  await prisma.payroll.update({ where: { id }, data: { paidAt: new Date() } });
  revalidatePath("/dashboard/hr/payroll");
}

export async function getPayrollForMonth(month: number, year: number) {
  await requireHR();
  return prisma.payroll.findMany({ where: { month, year }, include: { user: { select: { name: true } } } });
}