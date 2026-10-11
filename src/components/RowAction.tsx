'use client';
import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Bi } from './Bi';
import { Spinner } from './ui';
import type { ActionResult } from '@/lib/errors';
import type { Msg } from '@/lib/config/types';

/** A button that runs a Server Action (optionally after a confirm()), then refreshes the page. Shows errors inline. */
export function RowAction({ action, children, confirm, className }: { action: () => Promise<ActionResult<unknown>>; children: ReactNode; confirm?: string; className?: string }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [err, setErr] = useState<Msg | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" disabled={pending} className={cn('btn btn-sm', className ?? 'btn-outline')}
        onClick={() => { if (confirm && !window.confirm(confirm)) return; start(async () => { setErr(null); const r = await action(); if (!r.ok) setErr(r.error); else router.refresh(); }); }}>
        {pending && <Spinner />}{children}
      </button>
      {err && <span className="text-xs text-bad"><Bi v={err} /></span>}
    </span>
  );
}
