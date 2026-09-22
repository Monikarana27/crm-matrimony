"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  approveProfileAction,
  rejectProfileAction,
  getProfileHistory,
  deleteProfileAction,
} from "@/actions/profiles/profile.actions";
import { MoreHorizontal, Eye, Pencil, Check, X, History } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DeleteRowButton } from "@/components/shared/delete-row-button";


interface ActivityEntry {
  id: string;
  action: string;
  createdAt: Date;
  actor: { name: string };
}

interface ProfileRowActionsProps {
  profile: {
    id: string;
    name: string;
    approvalStatus: string;
  };
}

export function ProfileRowActions({ profile }: ProfileRowActionsProps) {
  const router = useRouter();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ActivityEntry[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(() => {
      approveProfileAction(profile.id);
    });
  }

  function handleReject() {
    startTransition(async () => {
      await rejectProfileAction(profile.id, rejectNotes);
      setRejectOpen(false);
      setRejectNotes("");
    });
  }

  function openHistory() {
    setHistoryOpen(true);
    startTransition(async () => {
      const entries = await getProfileHistory(profile.id);
      setHistory(entries);
    });
  }

  async function handleDeleteProfile() {
    await deleteProfileAction(profile.id);
    router.refresh();
  }

  const isPendingApproval = profile.approvalStatus === "PENDING_APPROVAL";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/admin/profiles/${profile.id}/edit`}>
              <Eye className="mr-2 h-3.5 w-3.5" />
              View / Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openHistory}>
            <History className="mr-2 h-3.5 w-3.5" />
            History
          </DropdownMenuItem>
          {isPendingApproval && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleApprove} disabled={isPending} className="text-emerald-600">
                <Check className="mr-2 h-3.5 w-3.5" />
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRejectOpen(true)} className="text-destructive">
                <X className="mr-2 h-3.5 w-3.5" />
                Reject
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteRowButton onDelete={handleDeleteProfile} entityLabel="Profile" entityName={profile.name} />

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Profile</DialogTitle>
            <DialogDescription>
              Add notes for {profile.name} explaining what needs to change.
            </DialogDescription>
          </DialogHeader>
         <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="e.g. Missing photo, incomplete family details..."
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>
              {isPending ? "Rejecting..." : "Reject Profile"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>History — {profile.name}</DialogTitle>
            <DialogDescription>Activity log for this profile</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {history === null && <p className="text-sm text-muted-foreground">Loading...</p>}
            {history?.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded.</p>}
            {history?.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between border-b pb-2 text-sm">
                <div>
                  <span className="font-medium">{entry.actor.name}</span>{" "}
                  <span className="text-muted-foreground">
                    {entry.action.toLowerCase().split("_").join(" ")}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
