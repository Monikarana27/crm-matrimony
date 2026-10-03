"use client";

import { useEffect, useState, useTransition } from "react";
import {
  addProfileDocumentAction,
  getProfileDocuments,
  deleteProfileDocumentAction,
  reorderPhotosAction,
} from "@/actions/documents/document.actions";
import { ArrowLeft, ArrowRight, Star, Trash2, Upload } from "lucide-react";

type Doc = { id: string; url: string; type: string; order: number };

const SLOT_LABELS = ["Primary", "Secondary 1", "Secondary 2", "Secondary 3"];

export function PhotosTab({ profileId }: { profileId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function refresh() {
    startTransition(async () => {
      const list = await getProfileDocuments(profileId);
      setDocs(list.filter((d) => d.type === "PHOTO"));
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Upload failed");
        return;
      }
      const result = await addProfileDocumentAction(profileId, data.url, "PHOTO");
      if (result?.error) {
        setError(result.error);
        return;
      }
      refresh();
    } catch {
      setError("Something went wrong while uploading.");
    } finally {
      setIsUploading(false);
    }
  }

  function applyOrder(ids: string[]) {
    setError(null);
    startTransition(async () => {
      const res = await reorderPhotosAction(profileId, ids);
      if (res?.error) setError(res.error);
      const list = await getProfileDocuments(profileId);
      setDocs(list.filter((d) => d.type === "PHOTO"));
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= docs.length) return;
    const ids = docs.map((d) => d.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    applyOrder(ids);
  }

  function handleDrop(target: number) {
    const from = dragIndex;
    setDragIndex(null);
    setOverIndex(null);
    if (from === null || from === target) return;
    const next = [...docs];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    setDocs(next);
    applyOrder(next.map((d) => d.id));
  }

  function makePrimary(index: number) {
    const ids = docs.map((d) => d.id);
    const [picked] = ids.splice(index, 1);
    applyOrder([picked, ...ids]);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteProfileDocumentAction(id, profileId);
      const list = await getProfileDocuments(profileId);
      setDocs(list.filter((d) => d.type === "PHOTO"));
    });
  }

  const canAddMore = docs.length < 5;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">PROFILE PHOTOS</h3>
      <p className="text-sm text-muted-foreground">
        Upload up to 5 photos. The first four print on the biodata: Primary, Secondary 1, Secondary 2 and Secondary 3.
        Photos marked Not on biodata stay on the profile only. Drag photos to reorder them, or use the arrows.
      </p>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {docs.map((doc, idx) => {
          const label = SLOT_LABELS[idx] ?? "Not on biodata";
          const badgeClass =
            idx === 0
              ? "bg-primary text-primary-foreground"
              : idx < 4
              ? "bg-blue-600 text-white"
              : "bg-muted text-muted-foreground";
          return (
            <div
              key={doc.id}
              draggable={!isPending}
              onDragStart={(e) => {
                setDragIndex(idx);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", doc.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (overIndex !== idx) setOverIndex(idx);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(idx);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={`space-y-1.5 cursor-grab ${dragIndex === idx ? "opacity-40" : ""} ${
                overIndex === idx && dragIndex !== null && dragIndex !== idx
                  ? "rounded-lg ring-2 ring-primary"
                  : ""
              }`}
            >
              <div className="relative aspect-square overflow-hidden rounded-lg border">
                <img src={doc.url} draggable={false} className="h-full w-full object-cover" alt="" />
                <span className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${badgeClass}`}>
                  {label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  disabled={isPending || idx === 0}
                  onClick={() => move(idx, -1)}
                  className="rounded border p-1 hover:bg-muted disabled:opacity-30"
                  title="Move earlier"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isPending || idx === 0}
                  onClick={() => makePrimary(idx)}
                  className="rounded border p-1 text-primary hover:bg-muted disabled:opacity-30"
                  title="Set as primary"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isPending || idx === docs.length - 1}
                  onClick={() => move(idx, 1)}
                  className="rounded border p-1 hover:bg-muted disabled:opacity-30"
                  title="Move later"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(doc.id)}
                  className="rounded border p-1 text-destructive hover:bg-muted disabled:opacity-30"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {canAddMore && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:bg-muted/50">
            <Upload className="h-5 w-5" />
            <span className="text-xs">{isUploading ? "Uploading..." : "Add Photo"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{docs.length} / 5 photos uploaded.</p>
    </div>
  );
}
