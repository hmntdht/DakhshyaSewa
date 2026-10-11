'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminBookingStatusAction, refundBookingAction } from '@/lib/admin/actions';
import { Bi } from '../Bi';
import { Notice, Spinner } from '../ui';
import type { Msg } from '@/lib/config/types';

const NEXT: Record<string, string[]> = { pending: ['confirmed', 'declined', 'cancelled'], confirmed: ['en_route', 'cancelled'], en_route: ['arrived', 'cancelled'], arrived: ['in_progress', 'cancelled'], in_progress: ['completed', 'cancelled'] };

export function BookingAdminActions({ id, status, canRefund }: { id: string; status: string; canRefund: boolean }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [err, setErr] = useState<Msg | null>(null); const [info, setInfo] = useState<Msg | null>(null);
  const opts = NEXT[status] ?? [];
  return (
    <div className="space-y-4">
      {opts.length > 0 && (
        <form className="flex flex-wrap items-end gap-3" action={(fd) => start(async () => { setErr(null); const r = await adminBookingStatusAction(id, String(fd.get('to')), String(fd.get('reason') ?? '')); if (!r.ok) setErr(r.error); else router.refresh(); })}>
          <label className="block"><span className="label">Move to</span><select name="to" className="field !w-44">{opts.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}</select></label>
          <label className="block min-w-48 flex-1"><span className="label">Reason (kept in the audit log)</span><input name="reason" maxLength={200} className="field" /></label>
          <button disabled={pending} className="btn btn-primary">{pending && <Spinner />}Apply</button>
        </form>
      )}
      {canRefund && <button type="button" disabled={pending} className="btn btn-outline" onClick={() => { if (window.confirm('Mark this booking as refunded? You must return the money yourself (gateway dashboard or cash).')) start(async () => { const r = await refundBookingAction(id); if (!r.ok) setErr(r.error); else { setInfo(r.message ?? null); router.refresh(); } }); }}>Mark as refunded</button>}
      {err && <Notice tone="error"><Bi v={err} /></Notice>}{info && <Notice tone="success"><Bi v={info} /></Notice>}
    </div>
  );
}
