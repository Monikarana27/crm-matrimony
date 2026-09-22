"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { getWorkspaceFeed, searchWorkspaceAction } from "@/actions/workspace/workspace.actions";
import { Composer } from "./composer";
import { MessageCard, type WorkspaceMessageData } from "./message-card";

export function WorkspaceFeed({ initialMessages }: { initialMessages: WorkspaceMessageData[] }) {
  const searchParams = useSearchParams();
  const attachType = searchParams.get("attachType");
  const attachId = searchParams.get("attachId");
  const attachLabel = searchParams.get("attachLabel");
  const [messages, setMessages] = useState<WorkspaceMessageData[]>(initialMessages);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WorkspaceMessageData[] | null>(null);

  const refresh = useCallback(async () => {
    const data = await getWorkspaceFeed();
    setMessages(data as WorkspaceMessageData[]);
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 12000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    const timeout = setTimeout(async () => {
      const results = await searchWorkspaceAction(query);
      setSearchResults(results as WorkspaceMessageData[]);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const displayList = searchResults ?? messages;

  return (
    <div className="space-y-4">
      <Composer
        onPosted={refresh}
        placeholder="Share an update... use @ to mention someone"
        initialAttachment={
          attachType && attachId && attachLabel
            ? { type: attachType as any, recordId: attachId, label: attachLabel }
            : undefined
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by employee, record ID, or keyword..."
          className="pl-9"
        />
      </div>

      <div className="space-y-3">
        {displayList.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {searchResults ? "No matching messages." : "No messages yet — start the conversation."}
          </p>
        )}
        {displayList.map((m) => (
          <MessageCard key={m.id} message={m} />
        ))}
      </div>
    </div>
  );
}