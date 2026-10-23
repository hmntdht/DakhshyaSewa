export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true">
      <div className="space-y-2">
        <div className="h-8 w-52 rounded-lg bg-surface" />
        <div className="h-4 w-72 rounded bg-surface/60" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-app border border-line bg-surface p-5 space-y-3">
            <div className="h-3 w-20 rounded bg-line" />
            <div className="h-7 w-28 rounded bg-line" />
          </div>
        ))}
      </div>

      <div className="rounded-app border border-line bg-surface p-6 space-y-4">
        <div className="h-5 w-40 rounded bg-line" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-line/60 bg-surface/50 p-4" />
          ))}
        </div>
      </div>
    </div>
  );
}
