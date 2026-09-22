"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-primary bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
    >
      Save as PDF
    </button>
  );
}
