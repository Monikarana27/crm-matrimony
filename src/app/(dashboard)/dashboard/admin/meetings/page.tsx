import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getMeetings } from "@/actions/meetings/meeting.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MeetingsTable } from "./meetings-table";

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const validStatus = ["SCHEDULED", "COMPLETED", "MISSED", "CANCELLED"].includes(status ?? "")
    ? (status as "SCHEDULED" | "COMPLETED" | "MISSED" | "CANCELLED")
    : undefined;

  const meetings = await getMeetings(validStatus ? { status: validStatus } : undefined);
  const session = await auth();
  const canDelete = !!session?.user && ["SUPER_ADMIN", "ADMIN"].includes(session.user.role);

  const tabs = [
    { label: "All Meetings", value: undefined },
    { label: "Upcoming", value: "SCHEDULED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Missed", value: "MISSED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Meetings"
        subtitle="Track face-to-face and tele meetings across profiles."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = validStatus === tab.value;
            const href = tab.value
              ? `/dashboard/admin/meetings?status=${tab.value}`
              : "/dashboard/admin/meetings";
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
          <Link href="/dashboard/admin/meetings/new">
            <Plus className="mr-2 h-4 w-4" />
            Schedule Meeting
          </Link>
        </Button>
      </div>

      <MeetingsTable meetings={meetings} canDelete={canDelete} />
    </div>
  );
}
