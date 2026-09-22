"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Upload } from "lucide-react";
import {
  addEmployeeDocumentAction,
  deleteEmployeeDocumentAction,
} from "@/actions/employees/employee.actions";

type EmployeeDocument = {
  id: string;
  url: string;
  uploadedAt: Date;
};

export function EmployeeDocuments({
  userId,
  initialDocuments,
}: {
  userId: string;
  initialDocuments: EmployeeDocument[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }

      const doc = await addEmployeeDocumentAction(userId, data.url);
      setDocuments((prev) => [doc, ...prev]);
      e.target.value = "";
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteEmployeeDocumentAction(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Documents</h3>
        <label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleUpload}
            disabled={isPending}
          />
          <Button asChild variant="outline" size="sm" disabled={isPending}>
            <span>
              <Upload className="mr-2 h-4 w-4" />
              {isPending ? "Uploading..." : "Upload Document"}
            </span>
          </Button>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {doc.url.split("/").pop()}
              </a>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={isPending}
                className="text-muted-foreground hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
