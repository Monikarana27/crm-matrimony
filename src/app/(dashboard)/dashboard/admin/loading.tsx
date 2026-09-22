function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6">
      <Pulse className="h-[132px] w-full rounded-2xl" />

      <div className="rounded-xl border bg-card p-6">
        <Pulse className="mb-4 h-5 w-32" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
              <Pulse className="h-9 w-9 shrink-0 rounded-full" />
              <Pulse className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <Pulse className="h-4 w-20" />
              <Pulse className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Pulse className="h-3.5 w-full" />
              <Pulse className="h-3.5 w-full" />
              <Pulse className="h-3.5 w-2/3" />
            </div>
            <Pulse className="h-1.5 w-full rounded-full" />
            <Pulse className="h-8 w-full rounded-md" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-xl border bg-card p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <Pulse className="h-5 w-32" />
            <Pulse className="h-5 w-24 rounded-full" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Pulse key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Pulse className="h-32 w-full rounded-xl" />
          <Pulse className="h-56 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
