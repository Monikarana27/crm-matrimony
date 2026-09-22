import Link from "next/link";
import { getUnifiedProfiles } from "@/actions/profiles/profile.actions";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProfilesTable } from "./profiles-table";

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const session = await auth();
  const canAssign = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  const validStatus = ["UNASSIGNED", "ASSIGNED", "REASSIGNED", "ON_HOLD", "EXPIRED"].includes(status ?? "")
    ? (status as "UNASSIGNED" | "ASSIGNED" | "REASSIGNED" | "ON_HOLD" | "EXPIRED")
    : undefined;
  const profiles = status === "WEBSITE"
    ? await getUnifiedProfiles({ source: "Website" })
    : status === "PAID"
      ? await getUnifiedProfiles({ paid: true })
      : await getUnifiedProfiles(validStatus ? { status: validStatus } : undefined);
  const employees = await prisma.user.findMany({
    where: { active: true, role: { in: ["SERVICE", "SERVICE_TL", "SERVICE_MANAGER", "SALES", "SALES_TL", "SALES_MANAGER"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const tabs = [
    { label: "All Profiles", value: undefined },
    { label: "Unassigned", value: "UNASSIGNED" },
    { label: "Assigned", value: "ASSIGNED" },
    { label: "Reassigned", value: "REASSIGNED" },
    { label: "Website Profiles", value: "WEBSITE" },
    { label: "Paid", value: "PAID" },
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Profiles"
        subtitle="Manage matrimonial profiles across the pipeline."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = (status ?? undefined) === tab.value;
            const href = tab.value
              ? `/dashboard/admin/profiles?status=${tab.value}`
              : "/dashboard/admin/profiles";
            return (
              <Link
                key={tab.label}
                href={href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/profiles/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Profile
          </Link>
        </Button>
      </div>

      <ProfilesTable profiles={profiles} employees={employees} basePath="/dashboard/admin/profiles" canAssign={canAssign} />
    </div>
  );
}

