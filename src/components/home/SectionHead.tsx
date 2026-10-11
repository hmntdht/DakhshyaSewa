import type { ReactNode } from 'react';

export function SectionHead({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5 sm:mb-14">
      <div className="max-w-2xl">
        <h2 className="text-balance text-3xl font-light leading-[1.08] tracking-tight sm:text-5xl">{title}</h2>
        {sub && <p className="mt-4 text-pretty text-base leading-relaxed text-muted sm:text-lg">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
