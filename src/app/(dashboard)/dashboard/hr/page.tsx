import { DashboardHero } from "@/components/layout/dashboard-hero";
import Link from "next/link";

export default function HRDashboard() {
  return (
    <div className="space-y-6">
      <DashboardHero title="HR Dashboard" subtitle="Employee management, attendance, recruitment, performance, payroll" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Attendance", href: "/dashboard/hr/attendance" },
          { label: "Leave", href: "/dashboard/hr/leave" },
          { label: "Recruitment", href: "/dashboard/hr/recruitment" },
          { label: "Performance", href: "/dashboard/hr/performance" },
          { label: "Payroll", href: "/dashboard/hr/payroll" },
        ].map((m) => (
          <Link key={m.href} href={m.href} className="rounded-lg border p-4 text-center hover:bg-muted/50">
            {m.label}
          </Link>
        ))}
      </div>
    </div>
  );
}