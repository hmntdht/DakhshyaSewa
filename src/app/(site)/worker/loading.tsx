export default function WorkerLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-surface" />
        <div className="h-4 w-64 rounded bg-surface/60" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-app border border-line bg-surface p-4 space-y-2">
            <div className="h-3 w-16 rounded bg-line" />
            <div className="h-6 w-24 rounded bg-line" />
          </div>
        ))}
      </div>
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-app border border-line bg-surface p-5" />
        ))}
      </div>
    </div>
  );
}
