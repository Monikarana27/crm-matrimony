function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

export default function ProfilesLoading() {
  return (
    <div className="space-y-6">
      <Pulse className="h-[100px] w-full rounded-2xl" />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Pulse key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <Pulse className="h-9 w-36 rounded-md" />
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border bg-muted/30 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Pulse key={i} className="h-9 w-32 rounded-md" />
        ))}
      </div>

      <Pulse className="h-16 w-full rounded-lg" />

      <div className="space-y-2 rounded-md border p-4">
        <Pulse className="h-9 w-72" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Pulse key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
