export default function WorkerDetailLoading() {
  return (
    <div className="container-x py-12 animate-pulse space-y-8" aria-busy="true">
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="h-24 w-24 rounded-full bg-surface" />
        <div className="space-y-3">
          <div className="h-8 w-48 rounded-lg bg-surface" />
          <div className="h-4 w-72 rounded bg-surface/60" />
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-surface" />
            <div className="h-6 w-24 rounded-full bg-surface" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="h-80 rounded-app border border-line bg-surface p-6" />
        <div className="h-80 rounded-app border border-line bg-surface p-6" />
      </div>
    </div>
  );
}
