"use server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { revalidatePath } from "next/cache";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function getMyTodayAttendance() {
  const session = await requireUser();
  const date = startOfToday();
  return prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  });
}

export async function selfCheckInAction() {
  const session = await requireUser();
  const date = startOfToday();
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  });
  if (existing?.checkIn) return { error: "Already checked in today" };

  await prisma.attendance.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    update: { checkIn: new Date(), status: "PRESENT" },
    create: { userId: session.user.id, date, checkIn: new Date(), status: "PRESENT" },
  });
  revalidatePath("/", "layout");
  return { error: null };
}

export async function startBreakAction() {
  const session = await requireUser();
  const date = startOfToday();
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  });
  if (!existing?.checkIn) return { error: "You need to check in first" };
  if (existing.checkOut) return { error: "You've already checked out for the day" };
  if (existing.breakStart && !existing.breakEnd) return { error: "You're already on a break" };

  await prisma.attendance.update({
    where: { userId_date: { userId: session.user.id, date } },
    data: { breakStart: new Date(), breakEnd: null },
  });
  revalidatePath("/", "layout");
  return { error: null };
}

export async function endBreakAction() {
  const session = await requireUser();
  const date = startOfToday();
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  });
  if (!existing?.breakStart || existing.breakEnd) return { error: "You're not currently on a break" };

  await prisma.attendance.update({
    where: { userId_date: { userId: session.user.id, date } },
    data: { breakEnd: new Date() },
  });
  revalidatePath("/", "layout");
  return { error: null };
}

export async function selfCheckOutAction() {
  const session = await requireUser();
  const date = startOfToday();
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  });
  if (!existing?.checkIn) return { error: "You haven't checked in today" };
  if (existing.checkOut) return { error: "Already checked out today" };
  if (existing.breakStart && !existing.breakEnd) return { error: "Please end your break first" };

  await prisma.attendance.update({
    where: { userId_date: { userId: session.user.id, date } },
    data: { checkOut: new Date() },
  });
  revalidatePath("/", "layout");
  return { error: null };
}

async function requireHR() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "ADMIN", "HR"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

// For the monthly admin/super-admin report
export async function getAttendanceForMonth(month: number, year: number) {
  await requireHR();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return prisma.attendance.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: [{ date: "desc" }],
    include: { user: { select: { id: true, name: true, role: true } } },
  });
}

export async function getAttendanceReport(filters: {
  startDate: Date;
  endDate: Date;
  employeeId?: string;
  role?: string;
}) {
  await requireHR();
  const { startDate, endDate, employeeId, role } = filters;
  return prisma.attendance.findMany({
    where: {
      date: { gte: startDate, lt: endDate },
      ...(employeeId ? { userId: employeeId } : {}),
      ...(role ? { user: { role: role as any } } : {}),
    },
    orderBy: [{ date: "desc" }],
    include: { user: { select: { id: true, name: true, role: true } } },
  });
}

export async function getAttendanceFilterEmployees() {
  await requireHR();
  return prisma.user.findMany({
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}
