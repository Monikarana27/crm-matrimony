import { DashboardHero } from "@/components/layout/dashboard-hero";
import { getProfileCreatorDashboard } from "@/actions/profile-queue/profile-queue.actions";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Loader2, AlertTriangle, CheckCircle2, ChevronRight, Inbox } from "lucide-react";
import { BiodataDownloadButton } from "@/components/shared/biodata-download-button";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
};

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QueueRow({
  href,
  name,
  phone,
  status,
  sentByName,
}: {
  href: string;
  name: string;
  phone: string;
  status: string;
  sentByName?: string | null;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">{phone}</p>
        {sentByName && (
          <p className="text-xs text-muted-foreground mt-0.5">Sent by {sentByName}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className={STATUS_STYLES[status] ?? ""}>
          {status.replace("_", " ")}
        </Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

export default async function ProfileCreatorDashboard() {
  const { pending, inProgress, completedToday, returnedForCorrection } = await getProfileCreatorDashboard();

  return (
    <div className="space-y-6">
           <div className="flex items-center justify-between">
        <DashboardHero
          title="Profile Creator Dashboard"
          subtitle="Pick up leads, build profiles, and track what's in flight."
        />
        <Button asChild>
          <Link href="/dashboard/profile-creator/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Profile
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Pending" value={pending.length} icon={Clock} colorClass="bg-amber-100 text-amber-700" />
        <StatCard label="In Progress" value={inProgress.length} icon={Loader2} colorClass="bg-blue-100 text-blue-700" />
        <StatCard label="Returned" value={returnedForCorrection.length} icon={AlertTriangle} colorClass="bg-red-100 text-red-700" />
        <StatCard label="Completed Today" value={completedToday.length} icon={CheckCircle2} colorClass="bg-emerald-100 text-emerald-700" />
      </div>

      {returnedForCorrection.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Returned for Correction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {returnedForCorrection.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/profile-creator/edit/${p.id}`}
                className="block rounded-lg border border-destructive/30 bg-destructive/5 p-4 hover:bg-destructive/10"
              >
                <p className="font-medium">
                  {p.name} <span className="text-muted-foreground">({p.profileCode})</span>
                </p>
                {p.approvalNotes && <p className="mt-1 text-sm text-muted-foreground">{p.approvalNotes}</p>}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-600" />
              Pending Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((q) => (
              <QueueRow
                key={q.id}
                href={`/dashboard/profile-creator/create/${q.id}`}
                name={q.lead.name}
                phone={q.lead.phone}
                status={q.status}
                sentByName={q.sentBy?.name}
              />
            ))}
            {pending.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-40" />
                <p className="text-sm">No leads waiting.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 text-blue-600" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {inProgress.map((q) => (
              <QueueRow
                key={q.id}
                href={`/dashboard/profile-creator/create/${q.id}`}
                name={q.lead.name}
                phone={q.lead.phone}
                status={q.status}
                sentByName={q.sentBy?.name}
              />
            ))}
            {inProgress.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-40" />
                <p className="text-sm">Nothing in progress.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Completed Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedToday.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <Inbox className="h-8 w-8 opacity-40" />
              <p className="text-sm">Nothing completed yet today.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {completedToday.map((q) => (
                <div
                  key={q.id}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"
                >
                  <p className="font-medium">{q.lead.name}</p>
                  <p className="text-sm text-muted-foreground">{q.lead.phone}</p>
                  {q.sentBy?.name && (
                    <p className="text-xs text-muted-foreground mt-0.5">Sent by {q.sentBy.name}</p>
                  )}

                  {q.createdProfileId && (
                    <div className="mt-2">
                      <BiodataDownloadButton profileId={q.createdProfileId} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
