"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MentionInput } from "./mention-input";
import { AttachmentPicker, type Attachment } from "./attachment-picker";
import { createMessageAction } from "@/actions/workspace/workspace.actions";

interface Employee {
  id: string;
  name: string;
}

export function Composer({
  parentId,
  onPosted,
  placeholder,
  autoFocus,
  initialAttachment,
}: {
  parentId?: string;
  onPosted?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  initialAttachment?: Attachment;
}) {
  const [content, setContent] = useState("");
  const [mentionedUsers, setMentionedUsers] = useState<Employee[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachment ? [initialAttachment] : []);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!content.trim()) return;
    startTransition(async () => {
      const result = await createMessageAction({
        content,
        parentId,
        mentionedUserIds: mentionedUsers.map((u) => u.id),
        attachments,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setContent("");
      setMentionedUsers([]);
      setAttachments([]);
      setError(null);
      onPosted?.();
    });
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <MentionInput
        value={content}
        onChange={setContent}
        mentionedUsers={mentionedUsers}
        onMentionedUsersChange={setMentionedUsers}
        placeholder={placeholder}
      />
      <AttachmentPicker attachments={attachments} onAttachmentsChange={setAttachments} />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSubmit} disabled={isPending || !content.trim()}>
          {isPending ? "Posting..." : parentId ? "Reply" : "Post"}
        </Button>
      </div>
    </div>
  );
}