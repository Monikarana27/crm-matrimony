"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export function BiodataDownloadButton({
  profileId,
  variant = "outline",
  size = "sm",
}: {
  profileId: string;
  variant?: "outline" | "default" | "ghost";
  size?: "sm" | "default";
}) {
  return (
    <Button variant={variant} size={size} asChild>
      <a href={`/api/biodata/${profileId}`} target="_blank" rel="noopener noreferrer">
        <FileDown className="mr-1.5 h-3.5 w-3.5" />
        Biodata PDF
      </a>
    </Button>
  );
}