import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Msg } from '@/lib/config/types';

/**
 * Bilingual text. Renders BOTH languages and lets CSS (html[data-lang]) show the active one, so pages stay
 * fully static/cacheable and the language switch is instant, with no flash and no cookie on the server.
 */
export function Bi({ v, en, ne, className }: { v?: Msg | null; en?: ReactNode; ne?: ReactNode; className?: string }) {
  const e = v?.en ?? en ?? '';
  const n = v?.ne || ne || e;
  if (e === n) return <>{e}</>;
  return (
    <>
      <span data-l="en" className={className}>{e}</span>
      <span data-l="ne" lang="ne" className={cn('font-ne', className)}>{n}</span>
    </>
  );
}

/** Pick the right half of a *_en / *_ne column pair from the database. */
export const pair = (en?: string | null, ne?: string | null): Msg => ({ en: en ?? '', ne: ne || en || '' });
