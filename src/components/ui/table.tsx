import * as React from "react";
import { cn } from "@/lib/utils";
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full max-h-[calc(100dvh-9rem)] overflow-auto rounded-lg border shadow-sm">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("bg-muted [&_tr]:border-b-2 [&_tr]:border-border sticky top-0 z-10", className)} {...props} />;
}
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0 [&_tr:nth-child(even)]:bg-muted/30", className)} {...props} />;
}
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors hover:bg-accent/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  );
}
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-12 px-5 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-5 py-4 align-middle", className)} {...props} />;
}
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
