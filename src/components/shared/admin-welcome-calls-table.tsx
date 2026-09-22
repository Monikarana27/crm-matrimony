"use client";
import Link from "next/link";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Clock, CheckCircle2 } from "lucide-react";

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
};

function formatDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";
}

function roleLabel(role: string) {
  return role.startsWith("SALES") ? "Sales" : role.startsWith("SERVICE") ? "Service" : role;
}

export function AdminWelcomeCallsTable({ rows }: { rows: Row[] }) {
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
            <Link href={`/dashboard/admin/profiles/${row.profile.id}`} className="text-primary hover:underline">
              {row.profile.name}
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
      render: (row) =>
        row.status === "COMPLETED" ? (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
          </Badge>
        ) : (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            <Clock className="mr-1 h-3 w-3" /> Pending
          </Badge>
        ),
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
      key: "assignedTo",
      header: "Assigned To",
      render: (row) =>
        row.assignedTo ? (
          <>
            {row.assignedTo.name}
            <span className="ml-1.5 text-xs text-muted-foreground">({roleLabel(row.assignedTo.role)})</span>
          </>
        ) : (
          <span className="text-xs italic text-muted-foreground">Unassigned</span>
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
