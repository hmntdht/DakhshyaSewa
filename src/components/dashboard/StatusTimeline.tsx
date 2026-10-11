import { Check, X } from 'lucide-react';
import { Bi } from '../Bi';
import { cn, fmtDateTime } from '@/lib/utils';
import type { Booking } from '@/types/db';

const STEPS = [
  { k: 'created_at', en: 'Booking placed', ne: 'बुकिङ भयो' }, { k: 'accepted_at', en: 'Confirmed by worker', ne: 'सेवाप्रदायकले पक्का गर्नुभयो' },
  { k: 'en_route_at', en: 'On the way', ne: 'बाटोमा' }, { k: 'arrived_at', en: 'Arrived', ne: 'आइपुग्नुभयो' },
  { k: 'started_at', en: 'Work started', ne: 'काम सुरु' }, { k: 'completed_at', en: 'Completed', ne: 'सकियो' },
] as const;

export function StatusTimeline({ b }: { b: Booking }) {
  const ended = b.status === 'cancelled' || b.status === 'declined';
  const lastDone = STEPS.reduce((n, s, i) => (b[s.k] ? i : n), 0);
  return (
    <ol className="space-y-0">
      {STEPS.map((s, i) => {
        const at = b[s.k]; const done = !!at;
        return (
          <li key={s.k} className="relative flex gap-4 pb-6 last:pb-0">
            {i < STEPS.length - 1 && <span aria-hidden className={cn('absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px', done && i < lastDone ? 'bg-primary' : 'bg-line')} />}
            <span className={cn('relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs', done ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-bg text-muted', !ended && i === lastDone && done && 'ring-4 ring-primary/20')}>{done ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
            <div className="pt-0.5"><p className={cn('text-sm font-medium', !done && 'text-muted')}><Bi en={s.en} ne={s.ne} /></p>{at && <p className="text-xs text-muted">{fmtDateTime(at)}</p>}</div>
          </li>
        );
      })}
      {ended && (
        <li className="flex gap-4 pt-6"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bad text-bg"><X className="h-3.5 w-3.5" /></span>
          <div className="pt-0.5"><p className="text-sm font-medium text-bad"><Bi en={b.status === 'declined' ? 'Declined by worker' : 'Cancelled'} ne={b.status === 'declined' ? 'सेवाप्रदायकले अस्वीकार गर्नुभयो' : 'रद्द भयो'} /></p>{b.cancelled_at && <p className="text-xs text-muted">{fmtDateTime(b.cancelled_at)}</p>}{b.cancel_reason && <p className="mt-1 text-xs text-muted">“{b.cancel_reason}”</p>}</div></li>
      )}
    </ol>
  );
}
