"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { addProfileDocumentAction, deleteProfileDocumentAction, setPrimaryPhotoAction } from "@/actions/documents/document.actions";
import { X, Star } from "lucide-react";

type Doc = { id: string; url: string; type: string; order: number };

export function DocumentUploader({ profileId, initialDocs }: { profileId: string; initialDocs: Doc[] }) {
  const [docs, setDocs] = useState(initialDocs);
  const [docType, setDocType] = useState("PHOTO");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const photoCount = docs.filter((d) => d.type === "PHOTO").length;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (docType === "PHOTO" && photoCount >= 5) {
      setError("Maximum 5 photos allowed per profile.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const { url } = await res.json();
      const result = await addProfileDocumentAction(profileId, url, docType as any);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setDocs((d) => [...d, { id: crypto.randomUUID(), url, type: docType, order: d.length }]);
    });
  }

  const photos = docs.filter((d) => d.type === "PHOTO").sort((a, b) => a.order - b.order);
  const others = docs.filter((d) => d.type !== "PHOTO");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PHOTO">Photo</SelectItem>
            <SelectItem value="ID_PROOF">ID Proof</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
        <input type="file" onChange={handleUpload} disabled={isPending} className="text-sm" />
        {docType === "PHOTO" && (
          <span className="text-xs text-muted-foreground">{photoCount}/5 photos</span>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {photos.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Photos (first is primary)</p>
          <div className="grid grid-cols-5 gap-3">
            {photos.map((d, idx) => (
              <div key={d.id} className="relative">
                <img src={d.url} className="h-24 w-full rounded-md object-cover" />
                {idx === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    Primary
                  </span>
                )}
                <div className="mt-1 flex justify-center gap-1">
                  {idx !== 0 && (
                    <button
                      type="button"
                      title="Set as primary"
                      onClick={() => startTransition(async () => {
                        await setPrimaryPhotoAction(d.id, profileId);
                        setDocs((prev) => {
                          const rest = prev.filter((p) => p.id !== d.id && p.type === "PHOTO");
                          const others2 = prev.filter((p) => p.type !== "PHOTO");
                          return [{ ...d, order: 0 }, ...rest.map((p, i) => ({ ...p, order: i + 1 })), ...others2];
                        });
                      })}
                      className="rounded-full bg-muted p-1 hover:bg-accent"
                    >
                      <Star className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startTransition(async () => {
                      await deleteProfileDocumentAction(d.id, profileId);
                      setDocs((prev) => prev.filter((x) => x.id !== d.id));
                    })}
                    className="rounded-full bg-destructive p-1 text-white hover:bg-destructive/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Other Documents</p>
          <div className="grid grid-cols-5 gap-3">
            {others.map((d) => (
              <div key={d.id} className="relative">
                <img src={d.url} className="h-24 w-full rounded-md object-cover" />
                <button
                  type="button"
                  onClick={() => startTransition(async () => {
                    await deleteProfileDocumentAction(d.id, profileId);
                    setDocs((prev) => prev.filter((x) => x.id !== d.id));
                  })}
                  className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
