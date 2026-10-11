import type { ReactNode } from 'react';
import { Star, Loader2, Inbox } from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import { Bi } from './Bi';
import type { Msg } from '@/lib/config/types';
import type { BookingStatus, PaymentStatus } from '@/types/db';

export function Spinner({ className }: { className?: string }) { return <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden />; }

export function Stars({ value, count, size = 14 }: { value: number; count?: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`${value.toFixed(1)} out of 5`}>
      <span className="inline-flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} width={size} height={size} className={i <= full ? 'fill-primary text-primary' : 'text-line'} />)}</span>
      {count !== undefined && <span className="text-xs text-muted">{count > 0 ? `${value.toFixed(1)} (${count})` : 'New'}</span>}
    </span>
  );
}

export function Avatar({ name, url, size = 44, className }: { name?: string | null; url?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: size * 0.36 };
  if (url) return <img src={url} alt={name ?? ''} loading="lazy" style={style} className={cn('rounded-full object-cover', className)} />;
  return <span style={style} className={cn('grid shrink-0 place-items-center rounded-full bg-primary/15 font-semibold text-primary', className)} aria-hidden>{initials(name)}</span>;
}

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-warn/15 text-warn', confirmed: 'bg-primary/15 text-primary', en_route: 'bg-primary/15 text-primary', arrived: 'bg-ok/15 text-ok',
  in_progress: 'bg-ok/15 text-ok', completed: 'bg-ok/15 text-ok', cancelled: 'bg-bad/15 text-bad', declined: 'bg-bad/15 text-bad',
  paid: 'bg-ok/15 text-ok', unpaid: 'bg-warn/15 text-warn', failed: 'bg-bad/15 text-bad', refunded: 'bg-fg/10 text-muted',
  approved: 'bg-ok/15 text-ok', rejected: 'bg-bad/15 text-bad', suspended: 'bg-bad/15 text-bad', open: 'bg-warn/15 text-warn', under_review: 'bg-primary/15 text-primary', resolved: 'bg-ok/15 text-ok',
};
export function Badge({ tone, children, className }: { tone?: string; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_TONE[tone ?? ''] ?? 'bg-fg/10 text-muted', className)}>{children}</span>;
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, Msg> = {
  pending: { en: 'Waiting for worker', ne: 'सेवाप्रदायकको प्रतीक्षा' }, confirmed: { en: 'Confirmed', ne: 'पक्का भयो' }, en_route: { en: 'On the way', ne: 'बाटोमा' },
  arrived: { en: 'Arrived', ne: 'आइपुग्नुभयो' }, in_progress: { en: 'In progress', ne: 'काम हुँदैछ' }, completed: { en: 'Completed', ne: 'सकियो' },
  cancelled: { en: 'Cancelled', ne: 'रद्द भयो' }, declined: { en: 'Declined', ne: 'अस्वीकृत' },
};
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, Msg> = {
  unpaid: { en: 'Unpaid', ne: 'भुक्तानी बाँकी' }, pending: { en: 'Pay on completion', ne: 'सकिएपछि भुक्तानी' }, paid: { en: 'Paid', ne: 'भुक्तानी भयो' },
  failed: { en: 'Payment failed', ne: 'भुक्तानी असफल' }, refunded: { en: 'Refunded', ne: 'फिर्ता भयो' },
};
export const StatusBadge = ({ status }: { status: BookingStatus }) => <Badge tone={status}><Bi v={BOOKING_STATUS_LABEL[status]} /></Badge>;

export function EmptyState({ title, hint, action }: { title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <Inbox className="h-8 w-8 text-muted" aria-hidden />
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}

export function PageTitle({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>{sub && <p className="mt-2 max-w-2xl text-muted">{sub}</p>}</div>
      {action}
    </div>
  );
}

export function Notice({ tone = 'info', children, className }: { tone?: 'info' | 'error' | 'success' | 'warn'; children: ReactNode; className?: string }) {
  const t = { info: 'border-line bg-elev text-fg', error: 'border-bad/40 bg-bad/10 text-bad', success: 'border-ok/40 bg-ok/10 text-ok', warn: 'border-warn/40 bg-warn/10 text-warn' }[tone];
  return <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-app border px-4 py-3 text-sm', t, className)}>{children}</div>;
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return <label className={cn('block', className)}><span className="label">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}</label>;
}
