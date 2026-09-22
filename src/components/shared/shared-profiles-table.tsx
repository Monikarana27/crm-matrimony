"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  addProfileShareCommentAction,
  updateClientInterestAction,
  notifyProspectAction,
  updateProfileShareFeedbackAction,
  getProfileShareFeedbackHistory,
} from "@/actions/profile-shares/profile-share.actions";
import { MessageSquare, ChevronDown, Pencil, History as HistoryIcon } from "lucide-react";
import { ProfileFollowUpsPanel } from "@/components/shared/profile-follow-ups-panel";

type Comment = { id: string; comment: string; createdAt: Date; author: { name: string } };
type Row = {
  id: string;
  sharedAt: Date;
  prospectStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "SENT" | "HOLD";
  emailStatus: string | null;
  clientStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "SENT" | "HOLD";
  prospectFeedback: string | null;
  clientFeedback: string | null;
  sharedProfile: { id: string; name: string; profileCode: string; photoUrl: string | null; email: string | null };
  sharedBy: { id: string; name: string } | null;
  interests: { status: "PENDING" | "ACCEPTED" | "REJECTED" | "SENT" | "HOLD" }[];
  comments: Comment[];
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  ACCEPTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  SENT: "bg-blue-100 text-blue-700 border-blue-200",
  HOLD: "bg-slate-100 text-slate-700 border-slate-200",
};

function StatusDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "PENDING" | "ACCEPTED" | "REJECTED" | "SENT" | "HOLD") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as any)}
      className={`rounded-md border px-2 py-1 text-xs font-medium ${STATUS_STYLES[value]}`}
    >
      <option value="PENDING">Pending</option>
      <option value="SENT">Sent</option>
      <option value="ACCEPTED">Accepted</option>
      <option value="REJECTED">Rejected</option>
      <option value="HOLD">Hold</option>
    </select>
  );
}

function NotifyProspectButton({
  profileShareId,
  emailStatus,
  prospectEmail,
}: {
  profileShareId: string;
  emailStatus: string | null;
  prospectEmail: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(prospectEmail ?? "");
  const router = useRouter();
  const alreadySent = emailStatus === "SENT";

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await notifyProspectAction(profileShareId, email);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="prospect@email.com"
        className="h-7 w-44 text-xs"
      />
      <Button
        size="sm"
        disabled={isPending || !email}
        onClick={handleClick}
        className="text-xs"
      >
        {isPending ? "Sending..." : "Notify Prospect"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function CommentThread({ profileShareId, comments }: { profileShareId: string; comments: Comment[] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!text.trim()) return;
    startTransition(async () => {
      await addProfileShareCommentAction(profileShareId, text);
      setText("");
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {comments.length} <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-md border bg-muted/30 p-2">
          {comments.map((c) => (
            <div key={c.id} className="text-xs">
              <span className="font-medium">{c.author.name}:</span> {c.comment}
            </div>
          ))}
          {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
          <div className="flex gap-1">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add feedback..."
              className="h-7 flex-1 rounded border border-input px-2 text-xs"
            />
            <Button size="sm" className="h-7 px-2 text-xs" disabled={isPending} onClick={submit}>
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

type FeedbackStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "HOLD";

function InlineProspectStatusDropdown({
  profileShareId,
  value,
}: {
  profileShareId: string;
  value: "PENDING" | "ACCEPTED" | "REJECTED" | "SENT" | "HOLD";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const current: FeedbackStatus = value === "SENT" ? "PENDING" : value;

  function handleChange(v: FeedbackStatus) {
    startTransition(async () => {
      const res = await updateProfileShareFeedbackAction(profileShareId, { prospectStatus: v });
      if (!res.error) router.refresh();
    });
  }

  return (
    <select
      value={current}
      disabled={isPending}
      onChange={(e) => handleChange(e.target.value as FeedbackStatus)}
      className={`rounded-md border px-2 py-1 text-xs font-medium ${STATUS_STYLES[value]} disabled:opacity-50`}
    >
      <option value="PENDING">Pending</option>
      <option value="ACCEPTED">Accepted</option>
      <option value="REJECTED">Rejected</option>
      <option value="HOLD">Hold</option>
    </select>
  );
}

function AddFeedbackDialog({
  profileShareId,
  prospectStatus,
  prospectFeedback,
  clientStatus,
  clientFeedback,
}: {
  profileShareId: string;
  prospectStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "SENT" | "HOLD";
  prospectFeedback: string | null;
  clientStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "SENT" | "HOLD";
  clientFeedback: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pStatus, setPStatus] = useState<FeedbackStatus>(
    prospectStatus === "SENT" ? "PENDING" : prospectStatus
  );
  const [pFeedback, setPFeedback] = useState(prospectFeedback ?? "");
  const [cStatus, setCStatus] = useState<FeedbackStatus>(
    clientStatus === "SENT" ? "PENDING" : clientStatus
  );
  const [cFeedback, setCFeedback] = useState(clientFeedback ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await updateProfileShareFeedbackAction(profileShareId, {
        prospectStatus: pStatus,
        prospectFeedback: pFeedback,
        clientStatus: cStatus,
        clientFeedback: cFeedback,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="rounded-md p-1 text-primary hover:bg-primary/10 hover:text-primary"
          title="Add feedback"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Feedback</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Prospect Status</Label>
            <Select value={pStatus} onValueChange={(v) => setPStatus(v as FeedbackStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="HOLD">Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Prospect Feedback</Label>
            <textarea
              value={pFeedback}
              onChange={(e) => setPFeedback(e.target.value)}
              className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Prospect's feedback..."
            />
          </div>
          <div className="space-y-2">
            <Label>Client Status (Internal)</Label>
            <Select value={cStatus} onValueChange={(v) => setCStatus(v as FeedbackStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="HOLD">Hold</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Separate from the Client Status column above — locks once Accepted.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Client Feedback</Label>
            <textarea
              value={cFeedback}
              onChange={(e) => setCFeedback(e.target.value)}
              className="min-h-20 w-full rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Client's feedback..."
            />
          </div>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={isPending} onClick={submit}>
            {isPending ? "Saving..." : "Save Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type FeedbackHistoryEntry = {
  id: string;
  type: "PROSPECT" | "CLIENT";
  status: string | null;
  feedback: string | null;
  createdAt: Date;
  author: { name: string } | null;
};

function FeedbackHistoryDialog({ profileShareId }: { profileShareId: string }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<FeedbackHistoryEntry[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v && entries === null) {
      startTransition(async () => {
        const rows = await getProfileShareFeedbackHistory(profileShareId);
        setEntries(rows as unknown as FeedbackHistoryEntry[]);
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground" title="View history">
          <HistoryIcon className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Feedback History</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          {isPending && <p className="text-sm text-muted-foreground">Loading...</p>}
          {entries && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">No feedback recorded yet.</p>
          )}
          {entries && entries.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">Type</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Feedback</th>
                  <th className="p-2 font-medium">Updated By</th>
                  <th className="p-2 font-medium">Updated At</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="p-2">{e.type === "PROSPECT" ? "Prospect" : "Client"}</td>
                    <td className="p-2">{e.status ?? "\u2014"}</td>
                    <td className="p-2">{e.feedback ?? "\u2014"}</td>
                    <td className="p-2">{e.author?.name ?? "Admin"}</td>
                    <td className="p-2">{new Date(e.createdAt).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SharedProfilesTable({
  rows,
  clientName,
  clientProfileId,
  clientId,
}: {
  rows: Row[];
  clientName: string;
  clientProfileId: string;
  clientId: string;
}) {
  const [, startTransition] = useTransition();

  function handleClientChange(id: string, status: any) {
    startTransition(() => updateClientInterestAction(id, status));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">All Shared Profiles With {clientName}</h3>
        <div className="flex items-center gap-2">
          <ProfileFollowUpsPanel profileId={clientId} />
          <Button size="sm" asChild>
            <Link href={`/dashboard/service/profile-search/${clientProfileId}`}>Select Profiles</Link>
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Prospect</th>
              <th className="p-3 font-medium">Prospect Status</th>
              <th className="p-3 font-medium">Client Status</th>
              <th className="p-3 font-medium">Feedback</th>
              <th className="p-3 font-medium">Notify Prospect</th>
              <th className="p-3 font-medium">Sent On</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const clientStatus = row.interests[0]?.status ?? "PENDING";
              return (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="p-3">
                    <Link
                      href={`/dashboard/admin/profiles/${row.sharedProfile.id}`}
                      target="_blank"
                      className="font-medium text-primary hover:underline"
                    >
                      {row.sharedProfile.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{row.sharedProfile.profileCode}</p>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <InlineProspectStatusDropdown profileShareId={row.id} value={row.prospectStatus} />
                      <AddFeedbackDialog
                        profileShareId={row.id}
                        prospectStatus={row.prospectStatus}
                        prospectFeedback={row.prospectFeedback}
                        clientStatus={row.clientStatus}
                        clientFeedback={row.clientFeedback}
                      />
                      <FeedbackHistoryDialog profileShareId={row.id} />
                    </div>
                  </td>
                  <td className="p-3">
                    <StatusDropdown value={clientStatus} onChange={(v) => handleClientChange(row.id, v)} />
                  </td>
                  <td className="p-3">
                    <CommentThread profileShareId={row.id} comments={row.comments} />
                  </td>
                  <td className="p-3">
                    <NotifyProspectButton profileShareId={row.id} emailStatus={row.emailStatus} prospectEmail={row.sharedProfile.email} />
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(row.sharedAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No profiles have been shared yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.some((r) => r.prospectStatus === "ACCEPTED" && (r.interests[0]?.status ?? "PENDING") === "ACCEPTED") && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          One or more matches have mutual acceptance — consider scheduling a meeting.
        </p>
      )}
    </div>
  );
}