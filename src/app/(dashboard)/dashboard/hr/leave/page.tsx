import { getLeaveRequests, reviewLeaveAction } from "@/actions/hr/hr.actions";
import { DashboardHero } from "@/components/layout/dashboard-hero";

export default async function LeavePage() {
  const requests = await getLeaveRequests();
  return (
    <div className="space-y-6">
      <DashboardHero title="Leave Requests" subtitle={`${requests.length} total`} />
      <div className="space-y-2">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
            <span>{r.user.name} — {new Date(r.startDate).toLocaleDateString()} to {new Date(r.endDate).toLocaleDateString()} ({r.status})</span>
            {r.status === "PENDING" && (
              <div className="flex gap-2">
                <form action={reviewLeaveAction.bind(null, r.id, "APPROVED")}>
                  <button className="rounded-md bg-emerald-500 px-3 py-1 text-sm text-white">Approve</button>
                </form>
                <form action={reviewLeaveAction.bind(null, r.id, "REJECTED")}>
                  <button className="rounded-md bg-destructive px-3 py-1 text-sm text-white">Reject</button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}