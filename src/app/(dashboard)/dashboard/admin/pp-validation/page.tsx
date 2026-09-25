import { DashboardHero } from "@/components/layout/dashboard-hero";
import { getAllPPRequests } from "@/lib/stats/pp-validation";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-300",
  NEEDS_REVISION: "bg-red-100 text-red-700 border-red-300",
};

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminPPValidationPage() {
  const rows = await getAllPPRequests();

  return (
    <div className="space-y-6">
      <DashboardHero
        title="PP Validation Report"
        subtitle="Every partner-preference validation request across all Sales employees."
      />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Client</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Status</th>
              <th className="p-3">Sales Employee</th>
              <th className="p-3">Assigned RM</th>
              <th className="p-3">Submitted</th>
              <th className="p-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.clientName}</td>
                <td className="p-3 text-muted-foreground">{r.clientPhone}</td>
                <td className="p-3">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[r.status]}`}>
                    {r.status.replace("_", " ")}
                  </span>
                </td>
                <td className="p-3">{r.submittedByName}</td>
                <td className="p-3 text-muted-foreground">{r.assignedEmployeeName ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{fmt(r.createdAt)}</td>
                <td className="p-3 text-muted-foreground">{fmt(r.updatedAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  No PP validation requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
