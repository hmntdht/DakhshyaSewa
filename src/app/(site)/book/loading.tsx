export default function BookLoading() {
  return (
    <div className="container-x py-10 sm:py-14 max-w-4xl animate-pulse space-y-8" aria-busy="true">
      <div className="flex items-center justify-between border-b border-line pb-6">
        <div className="space-y-2">
          <div className="h-8 w-44 rounded bg-surface" />
          <div className="h-4 w-64 rounded bg-surface/60" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-8 rounded-full bg-surface" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-app border border-line bg-surface p-5 space-y-3">
            <div className="h-10 w-10 rounded-full bg-line" />
            <div className="h-5 w-32 rounded bg-line" />
            <div className="h-3 w-48 rounded bg-line/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
