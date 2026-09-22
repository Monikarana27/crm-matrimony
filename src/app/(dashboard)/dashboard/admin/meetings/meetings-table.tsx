"use client";
import { useState, useTransition } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  updateMeetingStatusAction,
  updateMeetingOutcomeAction,
  rescheduleMeetingAction,
  updateMeetingNotesAction,
  deleteMeetingAction,
} from "@/actions/meetings/meeting.actions";
import { DeleteRowButton } from "@/components/shared/delete-row-button";

type MeetingRow = {
  id: string;
  type: string;
  status: string;
  outcome: string;
  scheduledAt: Date;
  reminderAt: Date | null;
  notes: string | null;
  profile: { id: string; name: string; profileCode: string };
  profileTwo: { id: string; name: string; profileCode: string } | null;
  assignedTo: { id: string; name: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  MISSED: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-700 border-gray-200",
};

const OUTCOME_LABELS: Record<string, string> = {
  PENDING: "Pending",
  POSITIVE: "Positive",
  NEGATIVE: "Negative",
  ONE_SIDED: "One-Sided Interest",
  FOLLOW_UP_NEEDED: "Follow-up Needed",
};

const OUTCOME_STYLES: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700 border-gray-200",
  POSITIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  NEGATIVE: "bg-red-100 text-red-700 border-red-200",
  ONE_SIDED: "bg-amber-100 text-amber-700 border-amber-200",
  FOLLOW_UP_NEEDED: "bg-blue-100 text-blue-700 border-blue-200",
};

const TYPE_LABELS: Record<string, string> = {
  FACE_TO_FACE: "Face to Face",
  TELE: "Tele Meeting",
};

function StatusSelect({ meeting }: { meeting: MeetingRow }) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(meeting.status);

  function handleChange(newStatus: string) {
    setValue(newStatus);
    startTransition(() => {
      updateMeetingStatusAction(
        meeting.id,
        newStatus as "SCHEDULED" | "COMPLETED" | "MISSED" | "CANCELLED"
      );
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-32 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
        <SelectItem value="COMPLETED">Completed</SelectItem>
        <SelectItem value="MISSED">Missed</SelectItem>
        <SelectItem value="CANCELLED">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  );
}

function OutcomeSelect({ meeting }: { meeting: MeetingRow }) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(meeting.outcome);

  // Outcome only really means something once the meeting has happened.
  if (meeting.status !== "COMPLETED") {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  function handleChange(newOutcome: string) {
    setValue(newOutcome);
    startTransition(() => {
      updateMeetingOutcomeAction(
        meeting.id,
        newOutcome as "PENDING" | "POSITIVE" | "NEGATIVE" | "ONE_SIDED" | "FOLLOW_UP_NEEDED"
      );
    });
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-40 text-xs">
        <SelectValue>
          <Badge variant="outline" className={OUTCOME_STYLES[value]}>
            {OUTCOME_LABELS[value]}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(OUTCOME_LABELS).map(([val, label]) => (
          <SelectItem key={val} value={val}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function toDatetimeLocalValue(date: Date) {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ReminderBadge({ meeting }: { meeting: MeetingRow }) {
  if (meeting.status !== "SCHEDULED" || !meeting.reminderAt) return null;
  const isDue = new Date(meeting.reminderAt).getTime() <= Date.now();
  if (!isDue) return null;
  return (
    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
      Reminder due
    </Badge>
  );
}

function RescheduleControl({ meeting }: { meeting: MeetingRow }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(toDatetimeLocalValue(meeting.scheduledAt));
  const [isPending, startTransition] = useTransition();

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span>
            {new Date(meeting.scheduledAt).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setIsEditing(true)}
          >
            Reschedule
          </Button>
        </div>
        <ReminderBadge meeting={meeting} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5" data-no-row-click>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      />
      <Button
        size="sm"
        className="h-8 px-2 text-xs"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await rescheduleMeetingAction(meeting.id, value);
            setIsEditing(false);
          })
        }
      >
        Save
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2 text-xs"
        disabled={isPending}
        onClick={() => setIsEditing(false)}
      >
        Cancel
      </Button>
    </div>
  );
}

function NotesCell({ meeting }: { meeting: MeetingRow }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(meeting.notes ?? "");
  const [isPending, startTransition] = useTransition();

  if (!isEditing) {
    return (
      <div className="flex max-w-[220px] items-start gap-2">
        <span className="line-clamp-2 text-xs text-muted-foreground">
          {meeting.notes || "No notes yet"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 shrink-0 px-1.5 text-xs"
          onClick={() => setIsEditing(true)}
        >
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-56 flex-col gap-1.5" data-no-row-click>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-16 text-xs"
        placeholder="Add meeting notes..."
      />
      <div className="flex gap-1.5">
        <Button
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await updateMeetingNotesAction(meeting.id, value);
              setIsEditing(false);
            })
          }
        >
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={isPending}
          onClick={() => setIsEditing(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function MeetingsTable({ meetings, canDelete = false }: { meetings: MeetingRow[]; canDelete?: boolean }) {
  const columns: Column<MeetingRow>[] = [
    {
      key: "profile",
      header: "Match",
      render: (row) => (
        <span className="font-medium">
          {row.profile.name}{" "}
          <span className="text-xs text-muted-foreground">
            ({row.profile.profileCode})
          </span>
          {row.profileTwo && (
            <>
              {" "}
              <span className="text-muted-foreground">&lt;-&gt;</span>{" "}
              {row.profileTwo.name}{" "}
              <span className="text-xs text-muted-foreground">
                ({row.profileTwo.profileCode})
              </span>
            </>
          )}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <Badge variant="outline">{TYPE_LABELS[row.type] ?? row.type}</Badge>
      ),
    },
    {
      key: "scheduledAt",
      header: "Scheduled At",
      sortable: true,
      accessor: (row) => new Date(row.scheduledAt).getTime(),
      render: (row) => <RescheduleControl meeting={row} />,
    },
    {
      key: "assignedTo",
      header: "Assigned To",
      render: (row) => row.assignedTo?.name ?? "-",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusSelect meeting={row} />,
    },
    {
      key: "outcome",
      header: "Outcome",
      render: (row) => <OutcomeSelect meeting={row} />,
    },
    {
      key: "notes",
      header: "Notes",
      render: (row) => <NotesCell meeting={row} />,
    },
    ...(canDelete
      ? [
          {
            key: "actions",
            header: "",
            render: (row: MeetingRow) => (
              <DeleteRowButton
                onDelete={() => deleteMeetingAction(row.id)}
                entityLabel="meeting"
                entityName={`${row.profile.name}${row.profileTwo ? ` <-> ${row.profileTwo.name}` : ""}`}
              />
            ),
          } as Column<MeetingRow>,
        ]
      : []),
  ];

  return (
    <DataTable
      data={meetings}
      columns={columns}
      searchPlaceholder="Search by profile name..."
      emptyMessage="No meetings scheduled yet."
    />
  );
}
