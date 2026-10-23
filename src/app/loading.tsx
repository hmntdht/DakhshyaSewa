export default function RootLoading() {
  return (
    <div className="container-x py-12 animate-pulse space-y-8" aria-busy="true">
      <div className="h-10 w-48 rounded-lg bg-surface/80" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-app border border-line bg-surface p-5 space-y-3">
            <div className="h-3 w-20 rounded bg-line" />
            <div className="h-7 w-28 rounded bg-line" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-app border border-line bg-surface" />
    </div>
  );
}
