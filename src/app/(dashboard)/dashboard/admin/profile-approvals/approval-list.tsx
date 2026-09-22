"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveProfileAction, requestChangesAction } from "@/actions/profiles/approval.actions";
import Link from "next/link";

type Profile = { id: string; name: string; profileCode: string };

export function ApprovalList({ profiles }: { profiles: Profile[] }) {
  const [items, setItems] = useState(profiles);
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <div className="space-y-3">
      {items.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-lg border p-4">
          <Link href={`/dashboard/admin/profiles/${p.id}/edit`} className="font-medium hover:underline">
            {p.name} ({p.profileCode})
          </Link>
          <div className="flex items-center gap-2">
            <input
              placeholder="Notes for changes..."
              className="h-9 w-56 rounded-md border border-input px-2 text-sm"
              onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => startTransition(async () => {
                await requestChangesAction(p.id, notes[p.id] || "Please review");
                setItems((prev) => prev.filter((x) => x.id !== p.id));
              })}
            >
              Needs Changes
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => startTransition(async () => {
                await approveProfileAction(p.id);
                setItems((prev) => prev.filter((x) => x.id !== p.id));
              })}
            >
              Approve
            </Button>
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-muted-foreground">Nothing pending.</p>}
    </div>
  );
}