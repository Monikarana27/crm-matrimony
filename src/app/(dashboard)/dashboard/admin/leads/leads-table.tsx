"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { LeadAssignmentHistoryDialog } from "./lead-assignment-history-dialog";
import { LeadCommentCell } from "@/components/leads/lead-comment-dialog";
import { LeadCommentHistoryDialog } from "@/components/leads/lead-comment-history-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { AssignAction } from "@/components/shared/assign-action";
import { DeleteRowButton } from "@/components/shared/delete-row-button";
import { LEAD_STATUS_OPTIONS, LEAD_STATUS_LABELS, LEAD_STATUS_STYLES } from "@/lib/leads/lead-status";
import {
  assignLeadAction,
  unassignLeadAction,
  bulkAssignLeadsAction,
  deleteLeadAction,
  updateLeadStatusAction,
} from "@/actions/leads/lead.actions";
import { sendToProfileCreationAction } from "@/actions/profile-queue/profile-queue.actions";
import { MoreHorizontal, ArrowRightCircle, Pencil, CheckCircle2, Trash2, MessageSquareText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type LeadRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  status: string;
  followUpDate: Date | null;
  createdAt: Date;
  notes: string | null;
  assignedTo: { id: string; name: string } | null;
  convertedProfileId: string | null;
  profileQueue: { id: string; status: string } | null;
  remarks: { remark: string | null; outcome: string; createdAt: Date }[];
};

type Employee = { id: string; name: string };

// ---- Follow-up urgency: computed in the browser so "today" is the rep's local day ----
type Bucket = "overdue" | "stale" | "today" | "tomorrow" | "later" | "none";
type Bounds = { today: number; tomorrow: number; dayAfter: number; staleBefore: number };

const DONE_STATUSES = new Set(["CONVERTED", "NOT_INTERESTED", "CLOSED", "NO_NOT_EXIST", "WRONG_NUMBER_FAKE_LEAD"]);
const BUCKET_RANK: Record<Bucket, number> = { today: 0, overdue: 1, tomorrow: 2, later: 2, stale: 3, none: 4 };

// Overdue by more than this many days counts as old data: no tint, sorted below upcoming work.
const STALE_AFTER_DAYS = 7;

function getBounds(todayStart: number): Bounds {
  const t = new Date(todayStart);
  t.setDate(t.getDate() + 1);
  const tomorrow = t.getTime();
  t.setDate(t.getDate() + 1);
  const s = new Date(todayStart);
  s.setDate(s.getDate() - STALE_AFTER_DAYS);
  return { today: todayStart, tomorrow, dayAfter: t.getTime(), staleBefore: s.getTime() };
}

function bucketOf(lead: { followUpDate: Date | null; status: string }, b: Bounds): Bucket {
  if (!lead.followUpDate || DONE_STATUSES.has(lead.status)) return "none";
  const t = new Date(lead.followUpDate).getTime();
  if (t < b.today) return t < b.staleBefore ? "stale" : "overdue";
  if (t < b.tomorrow) return "today";
  if (t < b.dayAfter) return "tomorrow";
  return "later";
}

// Follow-ups saved as a plain date sit at 00:00 UTC; don't show a time for those.
function hasTimeOfDay(d: Date) {
  return !(d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0);
}

function FollowUpBadge({ value }: { value: Date }) {
  const d = new Date(value);
  const date = d.toLocaleDateString("en-IN");
  if (!hasTimeOfDay(d)) return <span>{date}</span>;
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return <span className="whitespace-nowrap">{date}, {time}</span>;
}

const OUTCOME_STYLES: Record<string, string> = {
  INTERESTED: "text-green-700",
  FOLLOW_UP: "text-amber-700",
  NOT_INTERESTED: "text-red-700",
  DNP: "text-gray-500",
};

function InlineLeadStatusDropdown({ leadId, value }: { leadId: string; value: string }) {
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState(value);

  function handleChange(next: string) {
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      const res = await updateLeadStatusAction(leadId, next);
      if (!res?.success) setCurrent(prev);
    });
  }

  return (
    <select
      value={current}
      disabled={isPending}
      onChange={(e) => handleChange(e.target.value)}
      className={`rounded-md border px-2 py-1 text-xs font-medium ${LEAD_STATUS_STYLES[current] ?? ""} disabled:opacity-50`}
    >
      {LEAD_STATUS_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>{LEAD_STATUS_LABELS[opt]}</option>
      ))}
    </select>
  );
}

function LeadRowActions({ lead, canDelete }: { lead: LeadRow; canDelete: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [commentHistoryOpen, setCommentHistoryOpen] = useState(false);

  function handleSendToProfile() {
    startTransition(async () => {
      const result = await sendToProfileCreationAction(lead.id);
      setError(result?.error ?? null);
    });
  }

  if (lead.profileQueue) {
    return (
      <div className="flex items-center justify-end gap-2">
        <Badge variant="outline" className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {lead.profileQueue.status === "COMPLETED" ? "Profile Created" : "In Profile Queue"}
        </Badge>
        {canDelete && (
          <DeleteRowButton
            onDelete={() => deleteLeadAction(lead.id)}
            entityLabel="lead"
            entityName={lead.name}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/admin/leads/${lead.id}/edit`} className="text-blue-700 focus:text-blue-700">
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setHistoryOpen(true)} className="text-slate-700 focus:text-slate-700">
            <History className="mr-2 h-3.5 w-3.5" />
            View Assignment History
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSendToProfile} disabled={isPending} className="text-emerald-700 focus:text-emerald-700">
            <ArrowRightCircle className="mr-2 h-3.5 w-3.5" />
            {isPending ? "Sending..." : "Send to Profile Creation"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setCommentHistoryOpen(true)} className="text-cyan-700 focus:text-cyan-700">
            <MessageSquareText className="mr-2 h-3.5 w-3.5" />
            Comment History
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {canDelete && (
        <DeleteRowButton
          onDelete={() => deleteLeadAction(lead.id)}
          entityLabel="lead"
          entityName={lead.name}
        />
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
      <LeadAssignmentHistoryDialog
        leadId={lead.id}
        leadName={lead.name}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
      <LeadCommentHistoryDialog
        leadId={lead.id}
        leadName={lead.name}
        legacyNotes={lead.notes}
        open={commentHistoryOpen}
        onOpenChange={setCommentHistoryOpen}
      />
    </div>
  );
}

export function LeadsTable({
  leads,
  employees,
  canAssign = true,
}: {
  leads: LeadRow[];
  employees: Employee[];
  canAssign?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState("ALL");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkEmployeeId, setBulkEmployeeId] = useState("");
  const [isBulkAssigning, startBulkAssign] = useTransition();

  const sourceOptions = useMemo(
    () => Array.from(new Set(leads.map((l) => l.source).filter(Boolean))) as string[],
    [leads]
  );

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
      if (sourceFilter !== "ALL" && l.source !== sourceFilter) return false;
      if (canAssign) {
        if (assignedFilter === "UNASSIGNED_ONLY" && l.assignedTo) return false;
        if (assignedFilter !== "ALL" && assignedFilter !== "UNASSIGNED_ONLY" && l.assignedTo?.id !== assignedFilter)
          return false;
      }
      return true;
    });
  }, [leads, statusFilter, sourceFilter, assignedFilter, canAssign]);

  // "Today" is known only in the browser (server timezone may differ), so start null and set after mount.
  const [todayStart, setTodayStart] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      setTodayStart(d.getTime());
    };
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);
  const bounds = useMemo(() => (todayStart === null ? null : getBounds(todayStart)), [todayStart]);

  // Today first, then recent overdue (newest first), then upcoming, then old overdue, then no follow up.
  const sortedForDisplay = useMemo(() => {
    if (!bounds) return filtered;
    const time = (l: LeadRow) => new Date(l.followUpDate!).getTime();
    const decorated = filtered.map((l, i) => ({ l, i, b: bucketOf(l, bounds) }));
    decorated.sort((x, y) => {
      const rx = BUCKET_RANK[x.b];
      const ry = BUCKET_RANK[y.b];
      if (rx !== ry) return rx - ry;
      if (x.b === "overdue") {
        const diff = time(y.l) - time(x.l);
        if (diff !== 0) return diff;
      } else if (rx <= 2) {
        const diff = time(x.l) - time(y.l);
        if (diff !== 0) return diff;
      }
      return x.i - y.i;
    });
    return decorated.map((d) => d.l);
  }, [filtered, bounds]);

  function rowClassName(row: LeadRow) {
    if (!bounds) return "";
    const b = bucketOf(row, bounds);
    if (b === "overdue") return "border-l-4 border-l-red-500 bg-red-50 hover:bg-red-100/70";
    if (b === "today") return "border-l-4 border-l-amber-500 bg-amber-50 hover:bg-amber-100/70";
    return "";
  }

  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkAssign() {
    if (selected.size === 0 || !bulkEmployeeId) return;
    startBulkAssign(async () => {
      await bulkAssignLeadsAction(Array.from(selected), bulkEmployeeId);
      setSelected(new Set());
      setBulkEmployeeId("");
    });
  }

  async function handleAssign(leadId: string, employeeId: string) {
    await assignLeadAction(leadId, employeeId);
  }

  async function handleUnassign(leadId: string) {
    await unassignLeadAction(leadId);
  }

  const columns: Column<LeadRow>[] = [
    ...(canAssign
      ? [
          {
            key: "select",
            header: (
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-input" />
            ),
            render: (row: LeadRow) => (
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={() => toggleOne(row.id)}
                className="h-4 w-4 rounded border-input"
              />
            ),
          } as Column<LeadRow>,
        ]
      : []),
    {
      key: "name",
      header: "Lead",
      sortable: true,
      // Include the phone so searching by number still finds the row.
      accessor: (row) => `${row.name} ${row.phone}`,
      render: (row) => (
        <div className="min-w-0 leading-tight">
          {row.convertedProfileId ? (
            <Link
              href={`/dashboard/admin/profiles/${row.convertedProfileId}`}
              className="font-medium text-primary hover:underline"
            >
              {row.name}
            </Link>
          ) : (
            <LeadCommentCell
              variant="name"
              leadId={row.id}
              leadName={row.name}
              currentStatus={row.status}
              currentFollowUpDate={row.followUpDate}
              latest={row.remarks[0]}
              legacyNotes={row.notes}
            />
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">{row.phone}</p>
        </div>
      ),
    },
    {
      key: "followUpDate",
      header: "Status / Follow-up",
      sortable: true,
      accessor: (row) => (row.followUpDate ? new Date(row.followUpDate).getTime() : 0),
      render: (row) => (
        <div className="space-y-1">
          <InlineLeadStatusDropdown leadId={row.id} value={row.status} />
          <p className="text-xs text-muted-foreground">
            {row.followUpDate
              ? bounds
                ? <FollowUpBadge value={row.followUpDate} />
                : new Date(row.followUpDate).toLocaleDateString("en-IN")
              : "No follow-up"}
          </p>
        </div>
      ),
    },
    {
      key: "notes",
      header: "Comments",
      render: (row) => <LeadCommentCell leadId={row.id} leadName={row.name} currentStatus={row.status} currentFollowUpDate={row.followUpDate} latest={row.remarks[0]} legacyNotes={row.notes} />,
    },
    {
      key: "createdAt",
      header: "Created / Source",
      sortable: true,
      accessor: (row) => new Date(row.createdAt).getTime(),
      render: (row) => (
        <div className="text-sm leading-tight">
          <p>{new Date(row.createdAt).toLocaleDateString("en-IN")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{row.source || "—"}</p>
        </div>
      ),
    },
    {
      key: "assign",
      header: "Assigned To",
      render: (row) =>
        canAssign ? (
          <AssignAction
            entityId={row.id}
            currentAssignee={row.assignedTo}
            employees={employees}
            onAssign={handleAssign}
            onUnassign={handleUnassign}
          />
        ) : (
          <span className="text-sm text-muted-foreground">{row.assignedTo?.name ?? "—"}</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => <LeadRowActions lead={row} canDelete={canAssign} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {LEAD_STATUS_OPTIONS.map((opt) => (
              (canAssign || opt !== "NOT_INTERESTED") ? <SelectItem key={opt} value={opt}>{LEAD_STATUS_LABELS[opt]}</SelectItem> : null
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            {sourceOptions.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canAssign && (
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Assigned Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Employees</SelectItem>
              <SelectItem value="UNASSIGNED_ONLY">Unassigned</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {canAssign && (
        <div className="flex items-center gap-3 rounded-lg border bg-primary/5 p-3">
          <span className="text-sm font-medium text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : "Select rows below to bulk assign"}
          </span>
          <Select value={bulkEmployeeId} onValueChange={setBulkEmployeeId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Assign to employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleBulkAssign} disabled={selected.size === 0 || !bulkEmployeeId || isBulkAssigning}>
            {isBulkAssigning ? "Assigning..." : "Bulk Assign"}
          </Button>
          {selected.size > 0 && (
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          )}
        </div>
      )}

      <DataTable
        data={sortedForDisplay}
        rowClassName={rowClassName}
        columns={columns}
        searchPlaceholder="Search leads by name or phone..."
        emptyMessage="No leads yet. Add your first inquiry."
        density="compact"
      />
    </div>
  );
}

