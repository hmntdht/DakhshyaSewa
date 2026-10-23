export default function ServicePageLoading() {
  return (
    <div className="animate-pulse" aria-busy="true">
      <section className="border-b border-line">
        <div className="container-x grid gap-8 py-14 sm:py-20 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div className="space-y-4">
            <div className="h-14 w-14 rounded-full bg-surface" />
            <div className="h-12 w-3/4 rounded-lg bg-surface" />
            <div className="h-5 w-full max-w-lg rounded bg-surface/60" />
            <div className="h-5 w-2/3 max-w-md rounded bg-surface/60" />
          </div>
          <div className="rounded-app border border-line bg-surface p-7 space-y-4">
            <div className="h-4 w-20 rounded bg-line" />
            <div className="h-12 w-48 rounded bg-line" />
            <div className="h-12 w-full rounded-app bg-line" />
          </div>
        </div>
      </section>

      <section className="container-x py-14 sm:py-20 space-y-8">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 rounded bg-surface" />
          <div className="h-8 w-36 rounded-full bg-surface" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-app border border-line bg-surface p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-line" />
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-line" />
                  <div className="h-3 w-20 rounded bg-line/60" />
                </div>
              </div>
              <div className="h-14 rounded bg-line/40" />
              <div className="h-10 rounded-app bg-line/80" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
