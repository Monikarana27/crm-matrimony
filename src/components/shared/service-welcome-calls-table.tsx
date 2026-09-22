"use client";
import Link from "next/link";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, CheckCircle2, XCircle, CalendarClock, Pencil } from "lucide-react";
import { AddCallLogDialog } from "@/components/shared/add-call-log-dialog";
import { CallHistoryDialog } from "@/components/shared/call-history-dialog";
import { WelcomeCallAttachmentUpload } from "@/components/shared/welcome-call-attachment-upload";

type LogStatus = "PENDING" | "COMPLETED" | "MISSED" | "RESCHEDULED";

type Row = {
  id: string;
  status: "PENDING" | "COMPLETED";
  attachmentUrl: string | null;
  createdAt: Date;
  lead: { id: string; name: string; phone: string; email: string | null } | null;
  profile: { id: string; name: string; phone: string; email: string | null; profileCode: string | null } | null;
  assignedTo: { id: string; name: string; role: string } | null;
  membershipType: string | null;
  assignDate: Date | null;
  expiryDate: Date | null;
  soldBy: string | null;
  latestLogStatus: LogStatus | null;
};

function formatDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";
}

function callStatusBadge(row: Row) {
  const effective: LogStatus = row.latestLogStatus ?? (row.status === "COMPLETED" ? "COMPLETED" : "PENDING");
  const config: Record<LogStatus, { className: string; icon: React.ReactNode; label: string }> = {
    PENDING: { className: "border-amber-200 bg-amber-50 text-amber-700", icon: <Clock className="mr-1 h-3 w-3" />, label: "Pending" },
    COMPLETED: { className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <CheckCircle2 className="mr-1 h-3 w-3" />, label: "Completed" },
    MISSED: { className: "border-red-200 bg-red-100 text-red-700", icon: <XCircle className="mr-1 h-3 w-3" />, label: "Missed" },
    RESCHEDULED: { className: "border-blue-200 bg-blue-50 text-blue-700", icon: <CalendarClock className="mr-1 h-3 w-3" />, label: "Rescheduled" },
  };
  const c = config[effective];
  return (
    <Badge variant="outline" className={c.className}>
      {c.icon} {c.label}
    </Badge>
  );
}

export function ServiceWelcomeCallsTable({ rows }: { rows: Row[] }) {
  const columns: Column<Row>[] = [
    {
      key: "index",
      header: "#",
      render: (row) => rows.findIndex((r) => r.id === row.id) + 1,
    },
    {
      key: "name",
      header: "Name",
      render: (row) => {
        if (row.profile) {
          return (
            <Link href={`/dashboard/service/profiles/${row.profile.id}`} className="text-primary hover:underline">
              {row.profile.name}
            </Link>
          );
        }
        if (row.lead) {
          return <span>{row.lead.name} (Lead)</span>;
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: "profileId",
      header: "Profile ID",
      render: (row) => row.profile?.profileCode ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "contact",
      header: "Contact Details",
      render: (row) => {
        const contact = row.profile ?? row.lead;
        return (
          <div className="flex flex-col text-xs">
            <span>{contact?.phone ?? "—"}</span>
            {contact?.email && <span className="text-muted-foreground">{contact.email}</span>}
          </div>
        );
      },
    },
    {
      key: "membershipType",
      header: "Membership Type",
      render: (row) => row.membershipType ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "assignDate",
      header: "Assign Date",
      sortable: true,
      accessor: (row) => (row.assignDate ? new Date(row.assignDate).getTime() : 0),
      render: (row) => formatDate(row.assignDate),
    },
    {
      key: "expiryDate",
      header: "Expiry Date",
      sortable: true,
      accessor: (row) => (row.expiryDate ? new Date(row.expiryDate).getTime() : 0),
      render: (row) => formatDate(row.expiryDate),
    },
    {
      key: "soldBy",
      header: "Sold By",
      render: (row) => row.soldBy ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "status",
      header: "Call Status",
      render: (row) => callStatusBadge(row),
    },
    {
      key: "attachment",
      header: "Attachment",
      render: (row) =>
        row.attachmentUrl ? (
          
            <a
            href={row.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> View
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1.5" data-no-row-click>
          {row.profile && (
            <Link
              href={`/dashboard/service/profiles/${row.profile.id}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-500 text-white hover:bg-amber-600"
              title="Edit Profile"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          )}
          <AddCallLogDialog welcomeCallId={row.id} clientName={row.profile?.name ?? row.lead?.name ?? ""} />
          <CallHistoryDialog welcomeCallId={row.id} clientName={row.profile?.name ?? row.lead?.name ?? ""} />
          <WelcomeCallAttachmentUpload welcomeCallId={row.id} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={rows}
      columns={columns}
      searchPlaceholder="Search welcome calls..."
      emptyMessage="No welcome calls yet."
    />
  );
}
