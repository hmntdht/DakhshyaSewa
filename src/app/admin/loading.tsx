export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true">
      <div className="flex items-center justify-between pb-6 border-b border-line">
        <div className="space-y-2">
          <div className="h-8 w-44 rounded-lg bg-surface" />
          <div className="h-4 w-72 rounded bg-surface/60" />
        </div>
        <div className="h-9 w-28 rounded-full bg-surface" />
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
        <div className="h-4 w-36 rounded bg-line" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-line/50">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-line" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-line" />
                  <div className="h-3 w-48 rounded bg-line/60" />
                </div>
              </div>
              <div className="h-6 w-20 rounded-full bg-line/80" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
