"use client";
import Link from "next/link";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, CheckCircle2 } from "lucide-react";

type CallRow = {
  id: string;
  status: "PENDING" | "COMPLETED";
  attachmentUrl: string | null;
  createdAt: Date;
  lead: { id: string; name: string; phone: string } | null;
  profile: { id: string; name: string; phone: string; profileCode: string | null } | null;
  assignedTo: { id: string; name: string } | null;
  membershipType: string | null;
  assignDate: Date | null;
  expiryDate: Date | null;
  soldBy: string | null;
};

function formatDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";
}

export function OverdueWelcomeCallsTable({ calls }: { calls: CallRow[] }) {
  const columns: Column<CallRow>[] = [
    {
      key: "contact",
      header: "Contact",
      render: (row) => {
        if (row.profile) {
          return (
            <Link href={`/dashboard/admin/profiles/${row.profile.id}`} className="text-primary hover:underline">
              {row.profile.name} {row.profile.profileCode ? `(${row.profile.profileCode})` : ""}
            </Link>
          );
        }
        if (row.lead) {
          return (
            <Link href={`/dashboard/admin/leads/${row.lead.id}`} className="text-primary hover:underline">
              {row.lead.name} (Lead)
            </Link>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => row.profile?.phone ?? row.lead?.phone ?? "—",
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
      key: "assignedTo",
      header: "Assigned To",
      render: (row) => row.assignedTo?.name ?? "—",
    },
    {
      key: "status",
      header: "Call Status",
      render: (row) =>
        row.status === "COMPLETED" ? (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
          </Badge>
        ) : (
          <Badge variant="outline" className="border-red-200 bg-red-100 text-red-700">
            <Clock className="mr-1 h-3 w-3" /> Overdue
          </Badge>
        ),
    },
    {
      key: "createdAt",
      header: "Pending Since",
      sortable: true,
      accessor: (row) => new Date(row.createdAt).getTime(),
      render: (row) => {
        const hours = Math.floor((Date.now() - new Date(row.createdAt).getTime()) / (60 * 60 * 1000));
        return <span>{hours}h ago</span>;
      },
    },
    {
      key: "attachment",
      header: "View",
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
  ];

  return (
    <DataTable
      data={calls}
      columns={columns}
      searchPlaceholder="Search calls..."
      emptyMessage="No overdue welcome calls — everything's on track."
    />
  );
}
