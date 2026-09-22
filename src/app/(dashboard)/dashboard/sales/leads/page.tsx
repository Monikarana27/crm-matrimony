import Link from "next/link";
import { getLeads } from "@/actions/leads/lead.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { LeadsTable } from "../../admin/leads/leads-table";

export default async function SalesLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const validStatus = status === "CONVERTED" ? "CONVERTED" : undefined;

  const leads = await getLeads({
    ...(validStatus ? { status: validStatus } : {}),
  });

  const tabs = [
    { label: "All Leads", value: undefined },
    { label: "Converted", value: "CONVERTED" },
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        title="My Leads"
        subtitle="Your assigned leads — call, follow up, and convert."
      />
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = validStatus === tab.value;
          const href = tab.value ? `/dashboard/sales/leads?status=${tab.value}` : "/dashboard/sales/leads";
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
      <LeadsTable leads={leads} employees={[]} canAssign={false} />
    </div>
  );
}
