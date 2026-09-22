"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pin, MessageSquare } from "lucide-react";
import { toggleImportantAction, getMessageReplies } from "@/actions/workspace/workspace.actions";
import { Composer } from "./composer";

const ATTACHMENT_ROUTES: Record<string, (id: string) => string> = {
  LEAD: (id) => `/dashboard/admin/leads/${id}/edit`,
  PROFILE: (id) => `/dashboard/admin/profiles/${id}`,
  MEETING: () => `/dashboard/admin/meetings`,
  PAYMENT: () => `/dashboard/admin/payments`,
  SUBSCRIPTION: () => `/dashboard/admin/subscriptions`,
};

interface Mention {
  mentionedUser: { id: string; name: string };
}

interface Attachment {
  id: string;
  type: string;
  recordId: string;
  label: string;
}

export interface WorkspaceMessageData {
  id: string;
  content: string;
  isImportant: boolean;
  createdAt: Date;
  author: { id: string; name: string };
  attachments: Attachment[];
  mentions: Mention[];
  _count?: { replies: number };
}

function renderContent(content: string, mentions: Mention[]) {
  if (mentions.length === 0) return content;
  const names = mentions.map((m) => m.mentionedUser.name);
  const pattern = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "g");
  const parts = content.split(pattern);
  return parts.map((part, i) =>
    part.startsWith("@") && names.some((n) => part === `@${n}`) ? (
      <span key={i} className="font-medium text-primary">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function MessageCard({ message }: { message: WorkspaceMessageData }) {
  const [isPending, startTransition] = useTransition();
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<WorkspaceMessageData[] | null>(null);
  const [replyCount, setReplyCount] = useState(message._count?.replies ?? 0);

  function handleToggleImportant() {
    startTransition(() => {
      toggleImportantAction(message.id);
    });
  }

  async function loadReplies() {
    setShowReplies((prev) => !prev);
    if (replies === null) {
      const data = await getMessageReplies(message.id);
      setReplies(data as WorkspaceMessageData[]);
    }
  }

  function handleReplyPosted() {
    getMessageReplies(message.id).then((data) => {
      setReplies(data as WorkspaceMessageData[]);
      setReplyCount(data.length);
    });
  }

  return (
    <div className={`rounded-lg border p-4 ${message.isImportant ? "border-amber-300 bg-amber-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{message.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(message.createdAt).toLocaleString("en-IN")}
            </span>
            {message.isImportant && (
              <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-700">
                <Pin className="mr-1 h-3 w-3" />
                Important
              </Badge>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{renderContent(message.content, message.mentions)}</p>

          {message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((a) => (
                <Link
                  key={a.id}
                  href={ATTACHMENT_ROUTES[a.type]?.(a.recordId) ?? "#"}
                  className="rounded-full border bg-muted px-3 py-1 text-xs text-primary hover:underline"
                >
                  {a.type}: {a.label}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={loadReplies}>
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              {replyCount > 0 ? `${replyCount} ${replyCount === 1 ? "Reply" : "Replies"}` : "Reply"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToggleImportant} disabled={isPending}>
              <Pin className="mr-1.5 h-3.5 w-3.5" />
              {message.isImportant ? "Unpin" : "Mark Important"}
            </Button>
          </div>

          {showReplies && (
            <div className="mt-3 space-y-3 border-l-2 pl-4">
              {replies?.map((r) => (
                <div key={r.id} className="rounded-md bg-muted/30 p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.author.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">{renderContent(r.content, r.mentions)}</p>
                </div>
              ))}
              <Composer parentId={message.id} placeholder="Write a reply..." onPosted={handleReplyPosted} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}