'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Star } from 'lucide-react';
import { openDisputeAction, setStatusAction, startPaymentAction, submitReviewAction } from '@/lib/booking/actions';
import { launchPayment } from '@/lib/payments/client';
import { ActionForm, SubmitButton } from '../form';
import { Bi } from '../Bi';
import { useT, useTs } from '../providers';
import { Field, Notice, Spinner } from '../ui';
import { cn } from '@/lib/utils';
import type { Msg } from '@/lib/config/types';

function StarInput() {
  const [v, setV] = useState(5);
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      <input type="hidden" name="rating" value={v} />
      {[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" role="radio" aria-checked={v === i} aria-label={`${i}`} onClick={() => setV(i)} className="p-0.5"><Star className={cn('h-8 w-8 transition', i <= v ? 'fill-primary text-primary' : 'text-line')} /></button>)}
    </div>
  );
}

export function BookingActions({ id, status, payStatus, provider, canReview, canDispute, retryPay }: {
  id: string; status: string; payStatus: string; provider: string; canReview: boolean; canDispute: boolean; retryPay: boolean;
}) {
  const t = useT(); const ts = useTs(); const router = useRouter();
  const [pending, start] = useTransition(); const [err, setErr] = useState<Msg | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: Msg }>) => start(async () => { setErr(null); const r = await fn(); if (!r.ok) setErr(r.error ?? null); else router.refresh(); });
  const cancel = () => { if (window.confirm(ts('track.cancel_confirm'))) run(() => setStatusAction(id, 'cancelled', 'Cancelled by customer')); };
  const pay = () => start(async () => { setErr(null); const r = await startPaymentAction(id); if (!r.ok) setErr(r.error); else launchPayment(r.data!); });

  const canPay = false;
  return (
    <div className="space-y-6">
      {canPay && (
        <div className={cn('rounded-app border p-5', retryPay ? 'border-warn/50 bg-warn/10' : 'border-line bg-surface')}>
          <p className="font-medium">{t('track.pay_title')}</p><p className="mt-1 text-sm text-muted">{t('track.pay_sub')}</p>
          <button type="button" onClick={pay} disabled={pending} className="btn btn-primary mt-4">{pending ? <Spinner /> : <CreditCard className="h-4 w-4" />}{t('track.pay_now')}</button>
        </div>
      )}
      {err && <Notice tone="error"><Bi v={err} /></Notice>}
      {(status === 'pending' || status === 'confirmed') && <button type="button" onClick={cancel} disabled={pending} className="btn btn-danger">{pending && <Spinner />}{t('track.cancel')}</button>}

      {canReview && (
        <ActionForm action={submitReviewAction} className="card space-y-4 p-6">
          <h3 className="text-lg font-medium">{t('track.review_title')}</h3>
          <input type="hidden" name="bookingId" value={id} /><StarInput />
          <Field label={t('track.review_comment')}><textarea name="comment" rows={3} maxLength={800} className="field resize-none" /></Field>
          <SubmitButton>{t('track.review_send')}</SubmitButton>
        </ActionForm>
      )}
      {canDispute && (
        <details className="card group p-5">
          <summary className="cursor-pointer list-none text-sm font-medium text-muted transition hover:text-fg [&::-webkit-details-marker]:hidden">{t('track.dispute_open')}</summary>
          <ActionForm action={openDisputeAction} className="mt-4 space-y-4">
            <input type="hidden" name="bookingId" value={id} />
            <Field label={t('track.dispute_reason')}><input name="reason" required minLength={3} maxLength={120} className="field" /></Field>
            <Field label={t('track.dispute_details')}><textarea name="details" rows={3} maxLength={2000} className="field resize-none" /></Field>
            <SubmitButton className="btn-danger !bg-bad !text-bg">{t('track.dispute_send')}</SubmitButton>
          </ActionForm>
        </details>
      )}
    </div>
  );
}
