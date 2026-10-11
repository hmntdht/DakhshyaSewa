'use client';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Banknote, Check, CreditCard, ExternalLink, Smartphone, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { createBookingAction, quoteAction } from '@/lib/booking/actions';
import { launchPayment } from '@/lib/payments/client';
import { toMsg } from '@/lib/errors';
import { MapPicker } from '../map';
import { Bi } from '../Bi';
import { Icon } from '../Icon';
import { useT, useTs } from '../providers';
import { Avatar, Field, Notice, Spinner, Stars } from '../ui';
import { addDays, cn, dowOf, fmtDateLong, hhmmToMin, minToHhmm, nptToIso, rs, to12h, todayNpt } from '@/lib/utils';
import type { Category, ContractTemplate, Provider, Quote, SavedAddress, ServiceArea, Worker } from '@/types/db';
import type { Msg } from '@/lib/config/types';

type WorkerRow = Worker & { rate: number | null };
interface Props {
  categories: Category[]; areas: ServiceArea[]; contract: ContractTemplate | null; addresses: SavedAddress[];
  me: { name: string; phone: string }; rules: { minNoticeHours: number; maxAdvanceDays: number };
  payments: Record<Provider, boolean>; bookingsOpen: boolean; initial: { service?: string; worker?: string };
}
interface Draft {
  categoryId: string; workerId: string; date: string; time: string; hours: number;
  lat: number | null; lng: number | null; address: string; landmark: string; saveAs: string;
  promo: string; provider: Provider; signedName: string; agree: boolean; phone: string; notes: string;
}
type Act = { type: 'set'; patch: Partial<Draft> } | { type: 'reset'; draft: Draft };
const reduce = (s: Draft, a: Act): Draft => (a.type === 'reset' ? a.draft : { ...s, ...a.patch });
const STEPS = ['service', 'when', 'where', 'review', 'pay'] as const;
const KEY = 'ds-booking-draft-v1';

const PAY_META: Record<Provider, { icon: typeof Banknote; k: string }> = {
  cash: { icon: Banknote, k: 'pay.cash' }, esewa: { icon: Smartphone, k: 'pay.esewa' }, khalti: { icon: Smartphone, k: 'pay.khalti' }, stripe: { icon: CreditCard, k: 'pay.stripe' },
};

export function BookingWizard({ categories, areas, contract, addresses, me, rules, payments, bookingsOpen, initial }: Props) {
  const t = useT(); const ts = useTs(); const router = useRouter();
  const startCat = categories.find((c) => c.slug === initial.service);
  const firstPay = (['cash', 'esewa', 'khalti', 'stripe'] as Provider[]).find((p) => payments[p]) ?? 'cash';
  const base: Draft = { categoryId: startCat?.id ?? '', workerId: initial.worker ?? '', date: '', time: '', hours: startCat?.default_hours ?? 2, lat: null, lng: null, address: '', landmark: '', saveAs: '', promo: '', provider: firstPay, signedName: me.name, agree: false, phone: me.phone, notes: '' };
  const [d, dispatch] = useReducer(reduce, base);
  const set = useCallback((patch: Partial<Draft>) => dispatch({ type: 'set', patch }), []);
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<Msg | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── draft persistence (survives refresh / a detour to log in) ──
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) { const saved = JSON.parse(raw) as Partial<Draft>; dispatch({ type: 'set', patch: { ...saved, agree: false, ...(initial.service ? { categoryId: startCat?.id ?? saved.categoryId ?? '' } : {}), ...(initial.worker ? { workerId: initial.worker } : {}) } }); }
    } catch { /* corrupt draft: ignore */ }
    setHydrated(true);
  }, [initial.service, initial.worker, startCat?.id]);
  useEffect(() => { if (hydrated) try { sessionStorage.setItem(KEY, JSON.stringify({ ...d, agree: false })); } catch { /* private mode */ } }, [d, hydrated]);

  const cat = categories.find((c) => c.id === d.categoryId) ?? null;

  // ── workers for the chosen category ──
  const [sort, setSort] = useState<'rating' | 'price' | 'experience'>('rating');
  const [workers, setWorkers] = useState<WorkerRow[] | null>(null);
  useEffect(() => {
    if (!d.categoryId) { setWorkers(null); return; }
    let alive = true; setWorkers(null);
    fetch(`/api/workers?category=${d.categoryId}&sort=${sort}`).then((r) => (r.ok ? r.json() : [])).then((rows: WorkerRow[]) => { if (alive) setWorkers(rows); }).catch(() => alive && setWorkers([]));
    return () => { alive = false; };
  }, [d.categoryId, sort]);
  const worker = workers?.find((w) => w.id === d.workerId) ?? null;
  const workerRef = useRef<WorkerRow | null>(null); if (worker) workerRef.current = worker;
  const w = worker ?? (workerRef.current?.id === d.workerId ? workerRef.current : null);

  const pickCategory = (c: Category) => set({ categoryId: c.id, workerId: c.id === d.categoryId ? d.workerId : '', hours: c.price_unit === 'fixed' ? c.default_hours : Math.max(c.min_hours, c.id === d.categoryId ? d.hours : c.default_hours), time: '' });
  const fixed = cat?.price_unit === 'fixed';

  // ── date / slots ──
  const today = todayNpt(); const maxDate = addDays(today, rules.maxAdvanceDays);
  const [busy, setBusy] = useState<{ s: number; e: number }[]>([]);
  useEffect(() => {
    if (!w || !d.date) { setBusy([]); return; }
    let alive = true;
    createClient().rpc('worker_busy_slots', { p_worker_id: w.id, p_from: nptToIso(d.date, '00:00'), p_to: nptToIso(addDays(d.date, 1), '00:00') })
      .then(({ data }) => { if (alive) setBusy(((data ?? []) as { start_at: string; end_at: string }[]).map((b) => ({ s: +new Date(b.start_at), e: +new Date(b.end_at) }))); });
    return () => { alive = false; };
  }, [w, d.date]);
  const slots = useMemo(() => {
    if (!w || !d.date) return { off: false, list: [] as { time: string; disabled: boolean }[] };
    if (!w.available_days.includes(dowOf(d.date))) return { off: true, list: [] };
    const ws = hhmmToMin(w.work_start.slice(0, 5)), we = hhmmToMin(w.work_end.slice(0, 5)), dur = Math.round(d.hours * 60);
    const earliest = Date.now() + rules.minNoticeHours * 3_600_000;
    const list: { time: string; disabled: boolean }[] = [];
    for (let m = ws; m + dur <= we; m += 30) {
      const s = +new Date(nptToIso(d.date, minToHhmm(m))), e = s + dur * 60_000;
      list.push({ time: minToHhmm(m), disabled: s < earliest || busy.some((b) => s < b.e && e > b.s) });
    }
    return { off: false, list };
  }, [w, d.date, d.hours, busy, rules.minNoticeHours]);
  useEffect(() => { if (d.time && slots.list.find((s) => s.time === d.time)?.disabled !== false) set({ time: '' }); }, [slots, d.time, set]);

  // ── quote (database is the source of truth) ──
  const [quote, setQuote] = useState<Quote | null>(null); const [quoting, setQuoting] = useState(false); const [promoInput, setPromoInput] = useState(d.promo);
  useEffect(() => {
    if (step < 3 || !w || !cat) return;
    let alive = true; setQuoting(true);
    quoteAction({ workerId: w.id, categoryId: cat.id, hours: d.hours, promo: d.promo || undefined }).then((r) => { if (alive) { setQuote(r.ok ? r.data ?? null : null); setQuoting(false); } });
    return () => { alive = false; };
  }, [step, w, cat, d.hours, d.promo]);

  const startIso = d.date && d.time ? nptToIso(d.date, d.time) : '';
  const promoErr = quote?.promo_error ? toMsg(quote.promo_error) : null;

  // ── contract preview (final text is rendered + hashed inside the database at booking time) ──
  const vars: Record<string, string> = {
    platform: 'Daksha Sewa', booking_code: '(assigned when you confirm)', customer_name: d.signedName || me.name || '…', worker_name: w?.display_name ?? '…', service: cat?.name_en ?? '…',
    date: d.date ? fmtDateLong(startIso || nptToIso(d.date, '12:00')) : '…', time: d.time ? to12h(d.time) : '…', duration: `${d.hours} hour(s)`, address: d.address || '…', landmark: d.landmark || '-',
    total: quote ? rs(quote.total) : '…', payment_method: ts(PAY_META[d.provider].k),
  };
  const fill = (s: string | null) => (s ?? '').replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m);

  // ── validation per step ──
  const validate = (i: number): Msg | null => {
    if (i === 0 && (!cat || !w)) return { en: 'Choose a service and a worker to continue.', ne: 'जारी राख्न सेवा र सेवाप्रदायक रोज्नुहोस्।' };
    if (i === 1 && (!d.date || !d.time)) return { en: 'Pick a date and a time slot.', ne: 'मिति र समय रोज्नुहोस्।' };
    if (i === 2) {
      if (d.lat == null || d.lng == null) return { en: 'Drop a pin on the map for the visit.', ne: 'भेटका लागि नक्सामा स्थान राख्नुहोस्।' };
      if (d.address.trim().length < 3) return { en: 'Add a short address or landmark description.', ne: 'छोटो ठेगाना वा चिनारी लेख्नुहोस्।' };
    }
    if (i === 3) {
      if (!contract) return { en: 'The agreement is not set up yet. Please contact us.', ne: 'सम्झौता तयार छैन। कृपया सम्पर्क गर्नुहोस्।' };
      if (!quote) return { en: 'Waiting for the price. One moment.', ne: 'मूल्य आउँदैछ। एकछिन पर्खनुहोस्।' };
      if (d.signedName.trim().length < 2 || !d.agree) return { en: 'Type your name and tick the box to accept the agreement.', ne: 'आफ्नो नाम टाइप गरी सम्झौता स्वीकार गर्नुहोस्।' };
    }
    if (i === 4 && !/^[+\d][\d\s-]{6,18}$/.test(d.phone.trim())) return { en: 'Add a phone number the worker can call.', ne: 'सेवाप्रदायकले फोन गर्न सक्ने नम्बर राख्नुहोस्।' };
    return null;
  };
  const next = () => { const e = validate(step); setError(e); if (!e) { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const back = () => { setError(null); setStep(Math.max(0, step - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const submit = async () => {
    const e = validate(4) ?? [0, 1, 2, 3].map(validate).find(Boolean) ?? null;
    if (e) { setError(e); return; }
    setSubmitting(true); setError(null);
    const r = await createBookingAction({
      workerId: w!.id, categoryId: cat!.id, startIso, hours: d.hours, address: d.address.trim(), landmark: d.landmark.trim() || undefined, lat: d.lat!, lng: d.lng!,
      notes: d.notes.trim() || undefined, promo: quote?.promo_ok ? d.promo : undefined, provider: d.provider, signedName: d.signedName.trim(), agree: true, phone: d.phone.trim(), saveAs: d.saveAs.trim() || undefined,
    });
    if (!r.ok) { setError(r.error); setSubmitting(false); return; }
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    const { id, pay } = r.data!;
    if (pay) launchPayment(pay);
    else router.push(`/dashboard/bookings/${id}?new=1${d.provider !== 'cash' ? '&pay=retry' : ''}`);
  };

  if (!bookingsOpen) return <div className="container-x py-24"><Notice tone="warn" className="mx-auto max-w-lg text-center">{t('book.closed')}</Notice></div>;

  const labels = ['book.step.service', 'book.step.when', 'book.step.where', 'book.step.review', 'book.step.pay'];
  return (
    <div className="container-x py-10 sm:py-14">
      <ol className="mb-10 flex items-center gap-2 overflow-x-auto pb-2 sm:gap-3" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button type="button" disabled={i >= step} onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}
              className={cn('flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-sm transition', i === step ? 'border-primary bg-primary/10 text-fg' : i < step ? 'border-line text-fg hover:border-fg/40' : 'border-line text-muted')}>
              <span className={cn('grid h-7 w-7 place-items-center rounded-full text-xs font-semibold', i < step ? 'bg-primary text-primary-fg' : i === step ? 'bg-primary text-primary-fg' : 'bg-fg/10')}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
              <span className={i === step ? '' : 'hidden sm:inline'}>{t(labels[i])}</span>
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-line sm:w-8" aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {step === 0 && (
            <section className="space-y-10">
              <div>
                <h1 className="mb-5 text-3xl font-light tracking-tight">{t('book.choose_service')}</h1>
                <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
                  {categories.map((c) => (
                    <button key={c.id} type="button" role="radio" aria-checked={c.id === d.categoryId} onClick={() => pickCategory(c)}
                      className={cn('flex items-center gap-4 rounded-app border p-4 text-left transition', c.id === d.categoryId ? 'border-primary bg-primary/10' : 'border-line bg-surface hover:border-fg/40')}>
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Icon name={c.icon} className="h-5 w-5" /></span>
                      <span className="min-w-0"><span className="block font-medium leading-tight"><Bi en={c.name_en} ne={c.name_ne} /></span><span className="text-sm text-muted">{rs(c.base_price)}{c.price_unit === 'hour' ? ' / hr' : ''}</span></span>
                    </button>
                  ))}
                </div>
              </div>
              {cat && (
                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-light tracking-tight">{t('book.choose_worker')}</h2>
                    <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="field !w-auto !py-1.5 text-xs" aria-label="Sort workers">
                      <option value="rating">{ts('sort.rating')}</option><option value="price">{ts('sort.price')}</option><option value="experience">{ts('sort.experience')}</option>
                    </select>
                  </div>
                  {workers === null ? <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-app bg-surface" />)}</div>
                    : workers.length === 0 ? <Notice>{t('book.no_workers')}</Notice>
                    : <div role="radiogroup" className="space-y-3">{workers.map((x) => (
                        <div key={x.id} className={cn('flex items-center gap-4 rounded-app border p-4 transition', x.id === d.workerId ? 'border-primary bg-primary/10' : 'border-line bg-surface hover:border-fg/40')}>
                          <button type="button" role="radio" aria-checked={x.id === d.workerId} onClick={() => set({ workerId: x.id, time: '' })} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                            <Avatar name={x.display_name} url={x.avatar_url} size={52} />
                            <span className="min-w-0"><span className="block truncate font-medium"><Bi en={x.display_name} ne={x.display_name_ne} /></span><Stars value={Number(x.rating_avg)} count={x.rating_count} /><span className="mt-0.5 block text-xs text-muted">{x.experience_years} {ts('worker.years')} · {x.jobs_completed} {ts('worker.jobs')}</span></span>
                          </button>
                          <div className="text-right"><p className="text-lg font-semibold">{rs(x.rate ?? cat.base_price)}</p><p className="text-xs text-muted">{cat.price_unit === 'hour' ? '/ hr' : ts('common.fixed')}</p><Link href={`/workers/${x.id}`} target="_blank" className="mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">{t('common.profile')}<ExternalLink className="h-3 w-3" /></Link></div>
                        </div>))}</div>}
                </div>
              )}
            </section>
          )}

          {step === 1 && (
            <section className="space-y-8">
              <h1 className="text-3xl font-light tracking-tight">{t('book.when_title')}</h1>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t('book.date')}><input type="date" className="field" min={today} max={maxDate} value={d.date} onChange={(e) => set({ date: e.target.value, time: '' })} /></Field>
                <Field label={t('book.duration')} hint={fixed ? t('book.duration_fixed') : undefined}>
                  <select className="field" disabled={fixed} value={d.hours} onChange={(e) => set({ hours: Number(e.target.value), time: '' })}>
                    {fixed ? <option value={d.hours}>{d.hours} {ts('common.hours')}</option> : Array.from({ length: Math.round((8 - (cat?.min_hours ?? 1)) * 2) + 1 }, (_, i) => (cat?.min_hours ?? 1) + i * 0.5).map((h) => <option key={h} value={h}>{h} {ts('common.hours')}</option>)}
                  </select>
                </Field>
              </div>
              <div>
                <p className="label">{t('book.time')}{w && <span className="ml-2 font-normal">({to12h(w.work_start.slice(0, 5))} – {to12h(w.work_end.slice(0, 5))})</span>}</p>
                {!d.date ? <p className="text-sm text-muted">{t('book.pick_date')}</p>
                  : slots.off ? <Notice tone="warn">{t('book.day_off')}</Notice>
                  : slots.list.length === 0 ? <Notice tone="warn">{t('book.no_slots')}</Notice>
                  : <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">{slots.list.map((s) => (
                      <button key={s.time} type="button" disabled={s.disabled} onClick={() => set({ time: s.time })} aria-pressed={d.time === s.time}
                        className={cn('rounded-app border py-2.5 text-sm transition disabled:cursor-not-allowed disabled:text-muted/40 disabled:line-through', d.time === s.time ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-surface hover:border-fg/40')}>{to12h(s.time)}</button>))}</div>}
                {slots.list.length > 0 && slots.list.every((s) => s.disabled) && <p className="mt-3 text-sm text-muted">{t('book.all_taken')}</p>}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <h1 className="text-3xl font-light tracking-tight">{t('book.where_title')}</h1>
              {addresses.length > 0 && (
                <div className="flex flex-wrap gap-2">{addresses.map((a) => <button key={a.id} type="button" onClick={() => set({ lat: a.lat, lng: a.lng, address: a.address_text, landmark: a.landmark ?? '' })} className="chip hover:border-primary hover:text-fg">{a.label}</button>)}</div>
              )}
              <MapPicker areas={areas} value={d.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng } : null} onChange={(p) => set({ lat: p.lat, lng: p.lng, ...(p.address ? { address: p.address } : {}) })} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t('book.address')} className="sm:col-span-2"><input className="field" maxLength={300} value={d.address} onChange={(e) => set({ address: e.target.value })} placeholder={ts('book.address_ph')} /></Field>
                <Field label={t('book.landmark')}><input className="field" maxLength={200} value={d.landmark} onChange={(e) => set({ landmark: e.target.value })} placeholder={ts('book.landmark_ph')} /></Field>
                <Field label={t('book.save_as')}><input className="field" maxLength={40} value={d.saveAs} onChange={(e) => set({ saveAs: e.target.value })} placeholder={ts('book.save_as_ph')} /></Field>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-8">
              <h1 className="text-3xl font-light tracking-tight">{t('book.review_title')}</h1>
              <div>
                <p className="label">{t('book.promo')}</p>
                <div className="flex gap-2"><input className="field font-mono uppercase" maxLength={24} value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="DAKSHA200" />
                  <button type="button" className="btn btn-outline" onClick={() => set({ promo: promoInput.trim() })}><Tag className="h-4 w-4" />{t('book.apply')}</button></div>
                {promoErr && d.promo && <p className="mt-2 text-sm text-bad"><Bi v={promoErr} /></p>}
                {quote?.promo_ok && <p className="mt-2 text-sm text-ok">{t('book.promo_ok')}</p>}
              </div>
              <div>
                <h2 className="mb-3 text-xl font-medium">{t('book.contract')}</h2>
                <div className="max-h-80 overflow-y-auto rounded-app border border-line bg-surface p-5 text-sm leading-relaxed text-muted" tabIndex={0}>
                  {contract ? (<>
                    <div data-l="en"><p className="mb-3 text-base font-semibold text-fg">{contract.title_en}</p><p className="whitespace-pre-wrap">{fill(contract.body_en)}</p></div>
                    {contract.body_ne && <div data-l="ne" lang="ne" className="font-ne"><p className="mb-3 text-base font-semibold text-fg">{contract.title_ne}</p><p className="whitespace-pre-wrap">{fill(contract.body_ne)}</p></div>}
                  </>) : <p>—</p>}
                </div>
                <p className="mt-2 text-xs text-muted">{t('book.contract_note')}</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t('book.sign_name')} hint={t('book.sign_hint')}><input className="field" maxLength={80} autoComplete="name" value={d.signedName} onChange={(e) => set({ signedName: e.target.value })} /></Field>
                <label className="flex items-start gap-3 self-end rounded-app border border-line bg-surface p-4 text-sm"><input type="checkbox" checked={d.agree} onChange={(e) => set({ agree: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[rgb(var(--c-primary))]" /><span>{t('book.agree')}</span></label>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-8">
              <h1 className="text-3xl font-light tracking-tight">{t('book.pay_title')}</h1>
              <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(PAY_META) as Provider[]).filter((p) => payments[p]).map((p) => { const M = PAY_META[p]; return (
                  <button key={p} type="button" role="radio" aria-checked={d.provider === p} onClick={() => set({ provider: p })}
                    className={cn('flex items-start gap-4 rounded-app border p-4 text-left transition', d.provider === p ? 'border-primary bg-primary/10' : 'border-line bg-surface hover:border-fg/40')}>
                    <M.icon className="mt-0.5 h-5 w-5 text-primary" /><span><span className="block font-medium">{t(M.k)}</span><span className="text-sm text-muted">{t(`${M.k}.hint`)}</span></span>
                  </button>); })}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t('book.phone')} hint={t('book.phone_hint')}><input className="field" inputMode="tel" autoComplete="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
                <Field label={t('book.notes')} className="sm:col-span-2"><textarea className="field resize-none" rows={3} maxLength={600} value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder={ts('book.notes_ph')} /></Field>
              </div>
            </section>
          )}

          {error && <Notice tone="error" className="mt-6"><Bi v={error} /></Notice>}
          <div className="mt-8 flex items-center justify-between gap-3">
            <button type="button" onClick={back} disabled={step === 0 || submitting} className="btn btn-ghost"><ArrowLeft className="h-4 w-4" />{t('common.back')}</button>
            {step < 4 ? <button type="button" onClick={next} className="btn btn-primary btn-lg">{t('common.continue')}<ArrowRight className="h-4 w-4" /></button>
              : <button type="button" onClick={submit} disabled={submitting} className="btn btn-primary btn-lg">{submitting && <Spinner />}{t('book.confirm')}</button>}
          </div>
        </div>

        {/* ── live summary ── */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="d-shape-sm border border-line bg-surface p-6 sm:p-7">
            <h2 className="text-sm font-medium text-muted">{t('book.summary')}</h2>
            <dl className="mt-4 space-y-3.5 text-sm">
              <Row k={t('book.step.service')} v={cat ? <Bi en={cat.name_en} ne={cat.name_ne} /> : '—'} />
              <Row k={t('book.worker')} v={w ? <Bi en={w.display_name} ne={w.display_name_ne} /> : '—'} />
              <Row k={t('book.when')} v={d.date && d.time ? `${new Date(nptToIso(d.date, d.time)).toLocaleDateString('en-GB', { timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short' })}, ${to12h(d.time)} · ${d.hours}h` : '—'} />
              <Row k={t('book.where')} v={d.address ? <span className="line-clamp-2">{d.address}</span> : '—'} />
            </dl>
            <div className="mt-5 border-t border-line pt-5">
              {step >= 3 ? (quoting && !quote ? <Spinner className="text-muted" /> : quote ? <Price q={quote} hours={d.hours} t={t} /> : <p className="text-sm text-muted">—</p>)
                : cat && w ? <p className="text-sm text-muted">{t('book.from')} <b className="text-base text-fg">{rs(w.rate ?? cat.base_price)}</b>{cat.price_unit === 'hour' ? ' / hr' : ''}</p> : <p className="text-sm text-muted">{t('book.price_after')}</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const Row = ({ k, v }: { k: React.ReactNode; v: React.ReactNode }) => <div className="flex justify-between gap-4"><dt className="shrink-0 text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>;

function Price({ q, hours, t }: { q: Quote; hours: number; t: (k: string) => React.ReactNode }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between text-muted"><dt>{rs(q.unit_price)}{q.price_unit === 'hour' ? ` × ${hours}h` : ''}</dt><dd>{rs(q.subtotal)}</dd></div>
      {q.discount > 0 && <div className="flex justify-between text-ok"><dt>{t('book.discount')}</dt><dd>− {rs(q.discount)}</dd></div>}
      {q.vat > 0 && <div className="flex justify-between text-muted"><dt>VAT</dt><dd>{rs(q.vat)}</dd></div>}
      <div className="flex items-baseline justify-between border-t border-line pt-3"><dt className="font-medium">{t('book.total')}</dt><dd className="text-2xl font-semibold">{rs(q.total)}</dd></div>
    </dl>
  );
}
