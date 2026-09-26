import Link from "next/link";
import { getLeads, getWebsiteEnquiryCount, getUnseenWebsiteLeadsCount } from "@/actions/leads/lead.actions";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Button } from "@/components/ui/button";
import { Plus, Globe } from "lucide-react";
import { LeadsTable } from "./leads-table";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; pending?: string; followup?: string; created?: string }>;
}) {
  const session = await auth();
  const role = session!.user.role;
  const canAssign = role === "ADMIN" || role === "SUPER_ADMIN";

  const { status, pending, followup, created } = await searchParams;
  const ALL_STATUSES = [
    "ACTIVE",
    "CONVERTED",
    "NEW",
    "CONTACTED",
    "PENDING",
    "CLOSED",
    "NOT_INTERESTED",
    "INTERESTED",
  ] as const;
  // Employees never see Not Interested leads, so ignore that status for them.
  const validStatus =
    (ALL_STATUSES as readonly string[]).includes(status ?? "") && (canAssign || status !== "NOT_INTERESTED")
      ? (status as (typeof ALL_STATUSES)[number])
      : undefined;
  const staleOnly = pending === "stale";
  const followUpToday = followup === "today";
  const createdToday = created === "today";

  const leads = await getLeads({
    ...(validStatus ? { status: validStatus } : {}),
    ...(staleOnly ? { staleOnly: true } : {}),
    ...(followUpToday ? { followUpToday: true } : {}),
    ...(createdToday ? { createdToday: true } : {}),
  });
  const websiteEnquiryCount = canAssign ? await getWebsiteEnquiryCount() : 0;
  const unseenWebsiteLeadsCount = canAssign ? await getUnseenWebsiteLeadsCount() : 0;
  const employees = canAssign
    ? await prisma.user.findMany({
        // Devender Kumar (SERVICE_MANAGER) has cross-access to the Sales side and
        // should also appear as a lead assignee, even though his role isn't a SALES_*
        // one — included by id rather than broadening the role filter, since that
        // would also pull in other SERVICE_MANAGERs (e.g. Shahina Sheikh).
        where: {
          active: true,
          OR: [
            { role: { in: ["SALES", "SALES_TL", "SALES_MANAGER"] } },
            { id: "cmtikr0sw0007l39ioxk0lgns" },
          ],
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const tabs = [
    { label: "All Leads", value: undefined },
    { label: "Active", value: "ACTIVE" },
    { label: "Converted", value: "CONVERTED" },
    ...(canAssign ? [{ label: "Not Interested", value: "NOT_INTERESTED" }] : []),
    ...(canAssign ? [{ label: "Closed", value: "CLOSED" }] : []),
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        title={canAssign ? "Sales Leads" : "My Leads"}
        subtitle={
          canAssign
            ? "Track and convert inbound inquiries."
            : "Your assigned leads — call, follow up, and convert."
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = validStatus === tab.value;
            const href = tab.value
              ? `/dashboard/admin/leads?status=${tab.value}`
              : "/dashboard/admin/leads";
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
        {canAssign && (
          <div className="flex gap-2">
            <Button asChild variant="outline" className="relative">
              <Link href="/dashboard/admin/leads/website-enquiries">
                <Globe className="mr-2 h-4 w-4" />
                Website Enquiries
                {websiteEnquiryCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                    {websiteEnquiryCount}
                  </span>
                )}
                {unseenWebsiteLeadsCount > 0 && (
                  <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-background" />
                )}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/admin/leads/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Link>
            </Button>
          </div>
        )}
      </div>

      <LeadsTable leads={leads} employees={employees} canAssign={canAssign} />
    </div>
  );
}
