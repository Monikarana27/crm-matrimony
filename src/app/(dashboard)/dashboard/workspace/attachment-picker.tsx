"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { X, Paperclip } from "lucide-react";
import { searchAttachableRecords } from "@/actions/workspace/workspace.actions";

type RecordType = "LEAD" | "PROFILE" | "MEETING" | "PAYMENT" | "SUBSCRIPTION";

export interface Attachment {
  type: RecordType;
  recordId: string;
  label: string;
}

const TYPE_LABELS: Record<RecordType, string> = {
  LEAD: "Lead",
  PROFILE: "Profile",
  MEETING: "Meeting",
  PAYMENT: "Payment",
  SUBSCRIPTION: "Subscription",
};

export function AttachmentPicker({
  attachments,
  onAttachmentsChange,
}: {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<RecordType>("LEAD");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; label: string }[]>([]);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const found = await searchAttachableRecords(type, q);
    setResults(found);
  }

  function addAttachment(record: { id: string; label: string }) {
    if (attachments.some((a) => a.recordId === record.id && a.type === type)) return;
    onAttachmentsChange([...attachments, { type, recordId: record.id, label: record.label }]);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function removeAttachment(recordId: string, recordType: RecordType) {
    onAttachmentsChange(attachments.filter((a) => !(a.recordId === recordId && a.type === recordType)));
  }

  return (
    <div className="space-y-2">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a) => (
            <span
              key={`${a.type}-${a.recordId}`}
              className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs"
            >
              <span className="font-medium">{TYPE_LABELS[a.type]}:</span> {a.label}
              <button type="button" onClick={() => removeAttachment(a.recordId, a.type)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {!open ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Paperclip className="mr-1.5 h-3.5 w-3.5" />
          Attach CRM Record
        </Button>
      ) : (
        <div className="flex items-center gap-2 rounded-md border p-2">
          <Select value={type} onValueChange={(v) => { setType(v as RecordType); setQuery(""); setResults([]); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={`Search ${TYPE_LABELS[type]}s...`}
              autoFocus
            />
            {results.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => addAttachment(r)}
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}