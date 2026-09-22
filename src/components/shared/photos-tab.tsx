"use client";

import { useEffect, useState, useTransition } from "react";
import {
  addProfileDocumentAction,
  getProfileDocuments,
  deleteProfileDocumentAction,
  setPrimaryPhotoAction,
} from "@/actions/documents/document.actions";
import { Star, Trash2, Upload } from "lucide-react";

type Doc = { id: string; url: string; type: string; order: number };

export function PhotosTab({ profileId }: { profileId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteProfileDocumentAction(id, profileId);
      refresh();
    });
  }

  function handleSetPrimary(id: string) {
    startTransition(async () => {
      await setPrimaryPhotoAction(id, profileId);
      refresh();
    });
  }

  const canAddMore = docs.length < 5;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">PROFILE PHOTOS</h3>
      <p className="text-sm text-muted-foreground">
        Upload up to 5 photos. Mark one as primary — it appears in listings and the biodata.
      </p>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {docs.map((doc, idx) => (
          <div key={doc.id} className="group relative aspect-square overflow-hidden rounded-lg border">
            <img src={doc.url} className="h-full w-full object-cover" alt="" />
            {idx === 0 && (
              <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                Primary
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              {idx !== 0 && (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(doc.id)}
                  className="rounded-full bg-white p-1.5 text-primary hover:bg-white/90"
                  title="Set as primary"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(doc.id)}
                className="rounded-full bg-white p-1.5 text-destructive hover:bg-white/90"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

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
