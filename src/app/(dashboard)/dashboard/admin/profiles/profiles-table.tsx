"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BiodataDownloadButton } from "@/components/shared/biodata-download-button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import Link from "next/link";
import { Heart, Send, MoreHorizontal, Pencil, History as HistoryIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UnifiedAssignAction } from "./unified-assign-action";
import { bulkAssignProfilesAction, deleteProfileAction } from "@/actions/profiles/profile.actions";
import { bulkAssignLeadsAction } from "@/actions/leads/lead.actions";
import { sendToProfileCreationAction } from "@/actions/profile-queue/profile-queue.actions";
import type { UnifiedProfileRow, ProfileStatusLabel } from "@/actions/profiles/profile.actions";
import { InlineProfileRemarkEditor } from "@/components/shared/inline-profile-remark-editor";
import { DeleteRowButton } from "@/components/shared/delete-row-button";
import { addProfileRemarkAction, getProfileRemarks } from "@/actions/profiles/profile-remark.actions";
import { calculateAge } from "@/lib/utils/age";

type Employee = { id: string; name: string };

const STATUS_STYLES: Record<string, string> = {
  UNASSIGNED: "bg-amber-100 text-amber-700 border-amber-200",
  ASSIGNED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REASSIGNED: "bg-blue-100 text-blue-700 border-blue-200",
  ON_HOLD: "bg-orange-100 text-orange-700 border-orange-200",
  EXPIRED: "bg-red-100 text-red-700 border-red-200",
};

const PROGRESS_STYLES: Record<ProfileStatusLabel, string> = {
  "Lead Only": "bg-gray-100 text-gray-700 border-gray-200",
  "Awaiting Creation": "bg-amber-100 text-amber-700 border-amber-200",
  Draft: "bg-blue-100 text-blue-700 border-blue-200",
  "Pending Approval": "bg-amber-100 text-amber-700 border-amber-200",
  Approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Needs Changes": "bg-red-100 text-red-700 border-red-200",
};

function SendToCreationButton({ leadId }: { leadId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await sendToProfileCreationAction(leadId);
            setError(result?.error ?? null);
          })
        }
      >
        <Send className="mr-1.5 h-3.5 w-3.5" />
        {isPending ? "Sending..." : "Send to Profile Creation"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

type ProfileRemarkHistoryItem = { id: string; remark: string; createdAt: Date; actor: { name: string } };

function ProfileActionsMenu({ profileId, basePath }: { profileId: string; basePath: string }) {
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [remarks, setRemarks] = useState<ProfileRemarkHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleDeleteProfile() {
    await deleteProfileAction(profileId);
    router.refresh();
  }

  function openHistory() {
    setHistoryOpen(true);
    setLoading(true);
    getProfileRemarks(profileId)
      .then((data) => setRemarks(data as ProfileRemarkHistoryItem[]))
      .finally(() => setLoading(false));
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild className="text-violet-700 focus:bg-violet-50 focus:text-violet-700">
            <Link href={`${basePath}/${profileId}/edit`}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openHistory} className="text-cyan-700 focus:bg-cyan-50 focus:text-cyan-700">
            <HistoryIcon className="mr-2 h-3.5 w-3.5" />
            View History
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteRowButton onDelete={handleDeleteProfile} entityLabel="Profile" />

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Follow-up / Comment History</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!loading && remarks.length === 0 && (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
            {!loading &&
              remarks.map((r) => (
                <div key={r.id} className="rounded-md border-l-2 border-cyan-200 bg-cyan-50/50 px-3 py-2">
                  <p className="text-sm">{r.remark}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-cyan-700">{r.actor.name}</span>
                    {" · "}
                    {new Date(r.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ProfilesTable({
  profiles,
  employees,
  canAssign = true,
  basePath = "/dashboard/admin/profiles",
}: {
  profiles: UnifiedProfileRow[];
  employees: Employee[];
  canAssign?: boolean;
  basePath?: string;
}) {
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [religionFilter, setReligionFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [approvalFilter, setApprovalFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState("ALL");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkEmployeeId, setBulkEmployeeId] = useState("");
  const [isBulkAssigning, startBulkAssign] = useTransition();

  const religionOptions = useMemo(
    () => Array.from(new Set(profiles.map((p) => p.religion).filter(Boolean))) as string[],
    [profiles]
  );
  const cityOptions = useMemo(
    () => Array.from(new Set(profiles.map((p) => p.city).filter(Boolean))) as string[],
    [profiles]
  );

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (genderFilter !== "ALL" && p.gender !== genderFilter) return false;
      if (religionFilter !== "ALL" && p.religion !== religionFilter) return false;
      if (cityFilter !== "ALL" && p.city !== cityFilter) return false;
      if (approvalFilter !== "ALL" && p.approvalStatus !== approvalFilter) return false;
      if (canAssign) {
        if (assignedFilter === "UNASSIGNED_ONLY" && p.assignedTo) return false;
        if (assignedFilter !== "ALL" && assignedFilter !== "UNASSIGNED_ONLY" && p.assignedTo?.id !== assignedFilter)
          return false;
      }
      const age = calculateAge(p.dob);
      if (minAge && (age === null || age < parseInt(minAge))) return false;
      if (maxAge && (age === null || age > parseInt(maxAge))) return false;
      return true;
    });
  }, [profiles, genderFilter, religionFilter, cityFilter, approvalFilter, assignedFilter, minAge, maxAge, canAssign]);

  // All row kinds are assignable to a SERVICE employee now — a lead can be
  // handed to a service agent to help gather info before the profile exists.
  const selectableRows = filtered;
  const allSelected = selectableRows.length > 0 && selectableRows.every((p) => selected.has(p.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableRows.map((p) => p.id)));
    }
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
      const selectedRows = filtered.filter((p) => selected.has(p.id));
      const profileIds = selectedRows.filter((p) => p.kind === "PROFILE" && p.profileId).map((p) => p.profileId!);
      const leadIds = selectedRows.filter((p) => p.kind !== "PROFILE" && p.leadId).map((p) => p.leadId!);

      await Promise.all([
        profileIds.length > 0 ? bulkAssignProfilesAction(profileIds, bulkEmployeeId) : Promise.resolve(),
        leadIds.length > 0 ? bulkAssignLeadsAction(leadIds, bulkEmployeeId) : Promise.resolve(),
      ]);

      setSelected(new Set());
      setBulkEmployeeId("");
    });
  }

 const columns: Column<UnifiedProfileRow>[] = [
    ...(canAssign
      ? [
          {
            key: "select",
            header: (
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-input"
              />
            ),
            render: (row: UnifiedProfileRow) => (
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={() => toggleOne(row.id)}
                className="h-4 w-4 rounded border-input"
              />
            ),
            width: 40,
        } as Column<UnifiedProfileRow>,
        ]
      : []),
    {
      key: "name",
      header: "Profile",
      sortable: true,
      width: 220,
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          {row.photoUrl ? (
            <img src={row.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">
              {row.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{row.name}</p>
            {row.profileId ? (
              <Link
                href={`${basePath}/${row.profileId}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                {row.profileCode}
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "remarks",
      header: "Comments",
      render: (row) =>
        row.profileId ? (
          <InlineProfileRemarkEditor profileId={row.profileId} latest={row.remarks?.[0] ?? null} />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "details",
      header: "Details",
      render: (row) => {
        const age = calculateAge(row.dob);
        const gender = row.gender
          ? row.gender.charAt(0).toUpperCase() + row.gender.slice(1).toLowerCase()
          : null;
        const top = [gender, age != null ? `${age} yrs` : null].filter(Boolean).join(" · ");
        const bottom = [row.city, row.religion].filter(Boolean).join(" · ");
        return (
          <div className="text-sm leading-tight">
            <p>{top || "—"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{bottom || "—"}</p>
          </div>
        );
      },
    },
    { key: "phone", header: "Phone" },
    {
      key: "createdAt",
      header: "Created On",
      sortable: true,
      accessor: (row) => new Date(row.createdAt).getTime(),
      render: (row) => new Date(row.createdAt).toLocaleDateString("en-IN"),
    },
    {
      key: "assign",
      header: "Assigned To",
      render: (row) => {
        const targetId = row.kind === "PROFILE" ? row.profileId : row.leadId;
        if (!targetId) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return canAssign ? (
          <UnifiedAssignAction
            targetId={targetId}
            targetType={row.kind === "PROFILE" ? "PROFILE" : "LEAD"}
            currentAssignee={row.assignedTo}
            employees={employees}
          />
        ) : (
          <span className="text-sm text-muted-foreground">{row.assignedTo?.name ?? "—"}</span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => {
        if (row.kind === "LEAD" && row.leadId) {
          return <SendToCreationButton leadId={row.leadId} />;
        }
        if (row.kind === "QUEUE" && row.queueId) {
          return (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/profile-creator/create/${row.queueId}`}>Continue</Link>
            </Button>
          );
        }
        if (row.kind === "PROFILE" && row.profileId) {
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                asChild
                className="h-8 w-8 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700" title="Find Matches" aria-label="Find Matches"
              >
                <Link href={`/dashboard/service/matching/${row.profileId}`}>
                  <Heart className="h-4 w-4" />
                </Link>
              </Button>
              <BiodataDownloadButton profileId={row.profileId} />
              <ProfileActionsMenu profileId={row.profileId} basePath={basePath} />
            </div>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Genders</SelectItem>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={religionFilter} onValueChange={setReligionFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Religion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Religions</SelectItem>
            {religionOptions.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Cities</SelectItem>
            {cityOptions.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={minAge}
            onChange={(e) => setMinAge(e.target.value)}
            placeholder="Min age"
            className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value)}
            placeholder="Max age"
            className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>

        <Select value={approvalFilter} onValueChange={setApprovalFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Approval Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Approval</SelectItem>
            <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="NEEDS_CHANGES">Needs Changes</SelectItem>
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
        data={filtered}
        columns={columns}
        searchPlaceholder="Search by name, ID, or phone..."
        emptyMessage="No profiles found in this view."
        frozenColumnCount={canAssign ? 2 : 1}
      />
    </div>
  );
}





