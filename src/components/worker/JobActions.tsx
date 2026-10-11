'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Flag, MapPinCheck, Navigation, Play, X } from 'lucide-react';
import { setStatusAction, verifyPinAction } from '@/lib/booking/actions';
import { ShareLocation } from './ShareLocation';
import { Bi } from '../Bi';
import { useT, useTs } from '../providers';
import { Notice, Spinner } from '../ui';
import { rs } from '@/lib/utils';
import type { Msg } from '@/lib/config/types';

export function JobActions({ id, status, provider, total, dest, paid }: { id: string; status: string; provider: string; total: number; dest: { lat: number; lng: number }; paid: boolean }) {
  const t = useT(); const ts = useTs(); const router = useRouter();
  const [pending, start] = useTransition(); const [err, setErr] = useState<Msg | null>(null); const [pinMsg, setPinMsg] = useState('');
  const go = (to: 'confirmed' | 'declined' | 'en_route' | 'arrived' | 'completed' | 'cancelled', reason?: string) =>
    start(async () => { setErr(null); const r = await setStatusAction(id, to, reason); if (!r.ok) setErr(r.error); else router.refresh(); });
  const Btn = ({ onClick, icon, children, tone = 'btn-primary' }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode; tone?: string }) =>
    <button type="button" onClick={onClick} disabled={pending} className={`btn btn-lg ${tone}`}>{pending ? <Spinner /> : icon}{children}</button>;

  async function pin(fd: FormData) {
    setPinMsg(''); setErr(null);
    const r = await verifyPinAction(id, String(fd.get('pin') ?? ''));
    if (!r.ok) return setErr(r.error);
    if (!r.data!.ok) return setPinMsg(r.data!.locked ? ts('worker.pin_locked') : `${ts('worker.pin_wrong')} (${r.data!.attemptsLeft})`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {status === 'pending' && (
        paid || provider === 'cash'
          ? <div className="flex flex-wrap gap-3"><Btn onClick={() => go('confirmed')} icon={<CheckCircle2 className="h-5 w-5" />}>{t('worker.accept')}</Btn><Btn onClick={() => { const r = window.prompt(ts('worker.decline_reason')); if (r !== null) go('declined', r); }} icon={<X className="h-5 w-5" />} tone="btn-outline">{t('worker.decline')}</Btn></div>
          : <Notice tone="warn">{t('worker.awaiting_payment')}</Notice>
      )}
      {status === 'confirmed' && (
        <div className="flex flex-wrap gap-3"><Btn onClick={() => go('en_route')} icon={<Navigation className="h-5 w-5" />}>{t('worker.start_trip')}</Btn>
          <Btn onClick={() => { const r = window.prompt(ts('worker.cancel_reason')); if (r) go('cancelled', r); }} icon={<X className="h-5 w-5" />} tone="btn-danger">{t('track.cancel')}</Btn></div>
      )}
      {status === 'en_route' && (<>
        <ShareLocation bookingId={id} />
        <div className="flex flex-wrap gap-3"><a className="btn btn-outline btn-lg" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`}><Navigation className="h-5 w-5" />{t('worker.navigate')}</a>
          <Btn onClick={() => go('arrived')} icon={<MapPinCheck className="h-5 w-5" />}>{t('worker.arrived')}</Btn></div></>
      )}
      {status === 'arrived' && (
        <form action={pin} className="rounded-app border border-primary/40 bg-primary/10 p-6">
          <p className="font-medium">{t('worker.pin_title')}</p><p className="mt-1 text-sm text-muted">{t('worker.pin_sub')}</p>
          <div className="mt-5 flex gap-3"><input name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} required autoComplete="off" aria-label="PIN" className="field !w-40 text-center font-mono text-3xl tracking-[0.4em]" /><button className="btn btn-primary btn-lg"><Play className="h-5 w-5" />{t('worker.start_job')}</button></div>
          {pinMsg && <p className="mt-3 text-sm text-bad">{pinMsg}</p>}
        </form>
      )}
      {status === 'in_progress' && <div className="space-y-3"><Btn onClick={() => go('completed')} icon={<Flag className="h-5 w-5" />}>{t('worker.complete')}</Btn>{provider === 'cash' && <p className="text-sm text-muted">{t('worker.cash_note')} <b className="text-fg">{rs(total)}</b></p>}</div>}
      {err && <Notice tone="error"><Bi v={err} /></Notice>}
    </div>
  );
}
