'use client';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Banknote, Check, CreditCard, ExternalLink, Smartphone, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { createBookingAction, quoteAction } from '@/lib/booking/actions';
import { launchPayment } from '@/lib/payments/client';
import { toMsg } from '@/lib/errors';
import { LeafletLocationPicker } from '../map';
import { Bi } from '../Bi';
import { Icon } from '../Icon';
import { useT, useTs } from '../providers';
import { Avatar, Field, Notice, Spinner, Stars } from '../ui';
import { addDays, cn, dowOf, fmtDateLong, hhmmToMin, minToHhmm, nptToIso, to12h, todayNpt } from '@/lib/utils';
import type { Category, ContractTemplate, Provider, Quote, SavedAddress, ServiceArea, Worker } from '@/types/db';
import type { Msg } from '@/lib/config/types';
import { ServiceGuidelinesView } from '../services/ServiceGuidelinesView';
import { getServiceGuidelines } from '@/lib/services/guidelines';
import Image from 'next/image';
import { getServiceImage } from '@/lib/serviceImages';
import { rs } from '@/lib/utils';

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
  scopeAgreed: boolean; packageId?: string;
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
  const startGuide = startCat ? getServiceGuidelines(startCat.slug) : null;
  const firstPay = (['cash', 'esewa', 'khalti', 'stripe'] as Provider[]).find((p) => payments[p]) ?? 'cash';
  const base: Draft = {
    categoryId: startCat?.id ?? '', workerId: initial.worker ?? '', date: '', time: '',
    hours: startCat?.default_hours ?? 2, lat: null, lng: null, address: '', landmark: '',
    saveAs: '', promo: '', provider: firstPay, signedName: me.name, agree: false,
    phone: me.phone, notes: '', scopeAgreed: false, packageId: startGuide?.packages?.[0]?.id,
  };
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
  const currentGuide = cat ? getServiceGuidelines(cat.slug) : null;
  const currentPkg = currentGuide?.packages?.find((p) => p.id === d.packageId);

  const pickCategory = (c: Category) => {
    const guide = getServiceGuidelines(c.slug);
    set({
      categoryId: c.id,
      hours: c.price_unit === 'fixed' ? c.default_hours : Math.max(c.min_hours, c.id === d.categoryId ? d.hours : c.default_hours),
      time: '',
      scopeAgreed: false,
      packageId: guide?.packages?.[0]?.id,
    });
  };
  const fixed = cat?.price_unit === 'fixed';

  // ── dynamic clock to ensure past slots (e.g. 7:00 when it is 7:03) cannot be selected ──
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  // ── date / slots (standard platform business hours 07:00 – 19:00) ──
  const today = todayNpt(); const maxDate = addDays(today, rules.maxAdvanceDays);
  const slots = useMemo(() => {
    if (!d.date) return { off: false, list: [] as { time: string; disabled: boolean }[] };
    const ws = 7 * 60; // 07:00 AM
    const we = 19 * 60; // 07:00 PM
    const dur = Math.round(d.hours * 60);
    const noticeHours = Math.max(0, Number(rules?.minNoticeHours ?? 1));
    const earliest = nowMs + noticeHours * 3_600_000;
    const list: { time: string; disabled: boolean }[] = [];
    for (let m = ws; m + dur <= we; m += 30) {
      const timeStr = minToHhmm(m);
      const s = +new Date(nptToIso(d.date, timeStr));
      const isPast = s <= nowMs;
      const isTooSoon = s < earliest;
      list.push({ time: timeStr, disabled: isPast || isTooSoon });
    }
    return { off: false, list };
  }, [d.date, d.hours, rules?.minNoticeHours, nowMs]);

  useEffect(() => {
    if (d.time) {
      const selected = slots.list.find((s) => s.time === d.time);
      if (!selected || selected.disabled) set({ time: '' });
    }
  }, [slots, d.time, set]);

  // ── quote (database/category is the source of truth) ──
  const [quote, setQuote] = useState<Quote | null>(null); const [quoting, setQuoting] = useState(false); const [promoInput, setPromoInput] = useState(d.promo);
  useEffect(() => {
    if (step < 3 || !cat) return;
    let alive = true; setQuoting(true);
    quoteAction({ categoryId: cat.id, hours: d.hours, promo: d.promo || undefined }).then((r) => { if (alive) { setQuote(r.ok ? r.data ?? null : null); setQuoting(false); } });
    return () => { alive = false; };
  }, [step, cat, d.hours, d.promo]);

  const startIso = d.date && d.time ? nptToIso(d.date, d.time) : '';
  const promoErr = quote?.promo_error ? toMsg(quote.promo_error) : null;

  // ── contract preview (final text is rendered + hashed inside the database at booking time) ──
  const vars: Record<string, string> = {
    platform: 'Daksha Sewa', booking_code: '(assigned when you confirm)', customer_name: d.signedName || me.name || '…',
    worker_name: 'Daksha Sewa Certified Team (Assigned after confirmation)', service: cat?.name_en ?? '…',
    date: d.date ? fmtDateLong(startIso || nptToIso(d.date, '12:00')) : '…', time: d.time ? to12h(d.time) : '…', duration: `${d.hours} hour(s)`, address: d.address || '…', landmark: d.landmark || '-',
    total: 'To be confirmed upon administrator contact', payment_method: ts(PAY_META[d.provider].k),
  };
  const fill = (s: string | null) => (s ?? '').replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m);

  // ── validation per step ──
  const validate = (i: number): Msg | null => {
    if (i === 0 && !cat) return { en: 'Choose a service to continue.', ne: 'जारी राख्न एउटा सेवा रोज्नुहोस्।' };
    if (i === 1) {
      if (!d.date || !d.time) return { en: 'Pick a date and a time slot.', ne: 'मिति र समय रोज्नुहोस्।' };
      const slotTime = +new Date(nptToIso(d.date, d.time));
      const currentNow = Date.now();
      if (slotTime <= currentNow) {
        return { en: 'The selected time has already passed. Please choose a later time slot.', ne: 'रोजिएको समय बितिसकेको छ। कृपया आउँदो समय रोज्नुहोस्।' };
      }
      const minNoticeMs = Math.max(0, Number(rules?.minNoticeHours ?? 1)) * 3_600_000;
      if (slotTime < currentNow + minNoticeMs) {
        return { en: 'Please choose a later start time.', ne: 'कृपया अलि पछिको समय रोज्नुहोस्।' };
      }
    }
    if (i === 2) {
      if (d.lat == null || d.lng == null) return { en: 'Drop a pin on the map for the visit.', ne: 'भेटका लागि नक्सामा स्थान राख्नुहोस्।' };
      if (d.address.trim().length < 3) return { en: 'Add a short address or landmark description.', ne: 'छोटो ठेगाना वा चिनारी लेख्नुहोस्।' };
    }
    if (i === 3) {
      if (!contract) return { en: 'The agreement is not set up yet. Please contact us.', ne: 'सम्झौता तयार छैन। कृपया सम्पर्क गर्नुहोस्।' };
      if (!quote) return { en: 'Waiting for the price. One moment.', ne: 'मूल्य आउँदैछ। एकछिन पर्खनुहोस्।' };
      if (!d.scopeAgreed) {
        return {
          en: 'Please confirm that you have read and understood what is included and excluded from this service.',
          ne: 'कृपया यस सेवामा के समावेश छ र के छैन पढेर बुझ्नुभएको पुष्टि गर्नुहोस्।'
        };
      }
      if (d.signedName.trim().length < 2 || !d.agree) return { en: 'Type your name and tick the box to accept the agreement.', ne: 'आफ्नो नाम टाइप गरी सम्झौता स्वीकार गर्नुहोस्।' };
    }
    if (i === 4 && !/^[+\d][\d\s-]{6,18}$/.test(d.phone.trim())) return { en: 'Add a phone number our team can call.', ne: 'हाम्रो टोलीले सम्पर्क गर्न सक्ने फोन नम्बर राख्नुहोस्।' };
    return null;
  };
  const next = () => { const e = validate(step); setError(e); if (!e) { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const back = () => { setError(null); setStep(Math.max(0, step - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const submit = async () => {
    const e = validate(4) ?? [0, 1, 2, 3].map(validate).find(Boolean) ?? null;
    if (e) { setError(e); return; }
    setSubmitting(true); setError(null);
    const r = await createBookingAction({
      categoryId: cat!.id, startIso, hours: d.hours, address: d.address.trim(), landmark: d.landmark.trim() || undefined, lat: d.lat!, lng: d.lng!,
      notes: d.notes.trim() || undefined, promo: quote?.promo_ok ? d.promo : undefined, provider: d.provider, signedName: d.signedName.trim(), agree: true,
      scopeAgreed: true, packageId: d.packageId, scopePolicyVersion: '1.0',
      phone: d.phone.trim(), saveAs: d.saveAs.trim() || undefined,
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
                  {categories.map((c) => {
                    const img = getServiceImage(c.slug);
                    const selected = c.id === d.categoryId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => pickCategory(c)}
                        className={cn(
                          'flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-colors duration-150',
                          selected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                            : 'border-line bg-surface hover:border-fg/40'
                        )}
                      >
                        {img ? (
                          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-surface/50">
                            <Image
                              src={img}
                              alt={c.name_en}
                              fill
                              sizes="56px"
                              className="object-cover object-center"
                            />
                          </span>
                        ) : (
                          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                            <Icon name={c.icon} className="h-6 w-6" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold leading-tight text-fg">
                            <Bi en={c.name_en} ne={c.name_ne} />
                          </span>
                          <span className="text-xs text-muted block mt-1">
                            <Bi en="Certified Service" ne="प्रमाणित सेवा" />
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {cat && (
                <div className="rounded-app border border-primary/25 bg-primary/5 p-5">
                  <h3 className="text-base font-medium text-primary">Certified Professional Assignment</h3>
                  <p className="mt-1 text-sm text-muted">
                    Worker selection is handled manually by our administration. Once you confirm your booking, our team will contact you to verify details and assign the best qualified professional.
                  </p>
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
                <p className="label">{t('book.time')} <span className="ml-2 font-normal text-muted">(07:00 AM – 07:00 PM)</span></p>
                {!d.date ? <p className="text-sm text-muted">{t('book.pick_date')}</p>
                  : slots.off ? <Notice tone="warn">{t('book.day_off')}</Notice>
                  : slots.list.length === 0 ? <Notice tone="warn">{t('book.no_slots')}</Notice>
                  : <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">{slots.list.map((s) => (
                      <button
                        key={s.time}
                        type="button"
                        disabled={s.disabled}
                        onClick={() => {
                          if (s.disabled) return;
                          setError(null);
                          set({ time: s.time });
                        }}
                        aria-pressed={d.time === s.time}
                        className={cn(
                          'rounded-app border py-2.5 text-sm transition',
                          s.disabled
                            ? 'cursor-not-allowed opacity-30 line-through border-line bg-muted/10 text-muted pointer-events-none'
                            : d.time === s.time
                            ? 'border-primary bg-primary text-primary-fg font-medium shadow-sm'
                            : 'border-line bg-surface hover:border-fg/40 text-fg'
                        )}
                      >
                        {to12h(s.time)}
                      </button>))}</div>}
                {slots.list.length > 0 && slots.list.every((s) => s.disabled) && <p className="mt-3 text-sm text-muted">{t('book.all_taken')}</p>}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <h1 className="text-3xl font-light tracking-tight">{t('book.where_title')}</h1>
              {addresses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {addresses.map((a) => (
                    <button key={a.id} type="button"
                      onClick={() => set({ lat: a.lat, lng: a.lng, address: a.address_text, landmark: a.landmark ?? '' })}
                      className="chip hover:border-primary hover:text-fg">
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
              <LeafletLocationPicker
                areas={areas}
                value={d.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng } : null}
                onChange={(p) => set({ lat: p.lat, lng: p.lng, ...(p.address ? { address: p.address } : {}) })}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t('book.address')} className="sm:col-span-2">
                  <input className="field" maxLength={300} value={d.address}
                    onChange={(e) => set({ address: e.target.value })}
                    placeholder={ts('book.address_ph')} />
                </Field>
                <Field label={t('book.landmark')}>
                  <input className="field" maxLength={200} value={d.landmark}
                    onChange={(e) => set({ landmark: e.target.value })}
                    placeholder={ts('book.landmark_ph')} />
                </Field>
                <Field label={t('book.save_as')}>
                  <input className="field" maxLength={40} value={d.saveAs}
                    onChange={(e) => set({ saveAs: e.target.value })}
                    placeholder={ts('book.save_as_ph')} />
                </Field>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-8">
              <h1 className="text-3xl font-light tracking-tight">{t('book.review_title')}</h1>

              {/* ── Section: Please Read Before Booking (Service Scope Menu) ── */}
              <div className="rounded-app border border-line bg-surface p-5 sm:p-7 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                      Please Read Before Booking
                    </span>
                  </div>
                  <h2 className="text-2xl font-light tracking-tight text-fg">
                    <Bi en="Service Scope & Guidelines" ne="सेवाको दायरा र ग्राहक मार्गदर्शन" />
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    <Bi
                      en="Review the specific tasks included and excluded for this service. You must acknowledge the service scope below to proceed."
                      ne="यस सेवामा के समावेश छ र के छैन समीक्षा गर्नुहोस्। अगाडि बढ्न तलको सेवा दायरा स्वीकार गर्नुपर्छ।"
                    />
                  </p>
                </div>

                {cat && (
                  <ServiceGuidelinesView
                    slug={cat.slug}
                    selectedPackageId={d.packageId}
                    onPackageChange={(pkgId) => set({ packageId: pkgId })}
                    variant="booking"
                  />
                )}

                {/* Mandatory Scope Acknowledgment Checkbox */}
                <div className="border-t border-line/70 pt-5">
                  <label className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm cursor-pointer transition hover:bg-primary/10">
                    <input
                      type="checkbox"
                      checked={d.scopeAgreed}
                      onChange={(e) => set({ scopeAgreed: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded accent-[rgb(var(--c-primary))]"
                    />
                    <span className="font-medium text-fg leading-relaxed">
                      <Bi
                        en="I have read and understood what is included and excluded from this service."
                        ne="मैले यस सेवामा के समावेश छ र के समावेश छैन पढेको छु र बुझेको छु।"
                      />
                    </span>
                  </label>
                </div>
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
                {(['cash', 'esewa', 'khalti'] as Provider[]).map((p) => {
                  const M = PAY_META[p];
                  const isComingSoon = p === 'esewa' || p === 'khalti';
                  return (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={d.provider === p}
                      disabled={isComingSoon}
                      onClick={() => !isComingSoon && set({ provider: p })}
                      className={cn(
                        'relative flex items-start gap-4 rounded-app border p-4 text-left transition',
                        isComingSoon
                          ? 'cursor-not-allowed opacity-60 border-line bg-surface/50'
                          : d.provider === p
                            ? 'border-primary bg-primary/10'
                            : 'border-line bg-surface hover:border-fg/40'
                      )}
                    >
                      <M.icon className={cn('mt-0.5 h-5 w-5', isComingSoon ? 'text-muted' : 'text-primary')} />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="block font-medium">{t(M.k)}</span>
                          {isComingSoon && (
                            <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                              Coming soon
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-muted">{t(`${M.k}.hint`)}</span>
                      </span>
                    </button>
                  );
                })}
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
              {currentPkg && <Row k="Package" v={<Bi en={currentPkg.name_en} ne={currentPkg.name_ne} />} />}
              <Row k={t('book.worker')} v={<span className="text-xs text-muted">Assigned by admin</span>} />
              <Row k={t('book.when')} v={d.date && d.time ? `${new Date(nptToIso(d.date, d.time)).toLocaleDateString('en-GB', { timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short' })}, ${to12h(d.time)} · ${d.hours}h` : '—'} />
              <Row k={t('book.where')} v={d.address ? <span className="line-clamp-2">{d.address}</span> : '—'} />
            </dl>

            {currentGuide?.keyExclusionsSummary && (
              <div className="mt-4 rounded-xl border border-line/70 bg-elev/40 p-3 text-xs">
                <span className="font-semibold text-muted block mb-1">
                  Key Exclusions
                </span>
                <span className="text-muted leading-relaxed">
                  <Bi en={currentGuide.keyExclusionsSummary.en} ne={currentGuide.keyExclusionsSummary.ne} />
                </span>
              </div>
            )}

            <div className="mt-5 border-t border-line pt-5 space-y-1.5">
              <span className="text-xs font-semibold text-muted block">
                <Bi en="Order Confirmation" ne="अर्डर पुष्टि" />
              </span>
              <p className="text-xs leading-relaxed text-muted">
                <Bi
                  en="Pricing and service details will be confirmed directly with you by our administrator upon review."
                  ne="मूल्य र सेवा सम्बन्धी थप विवरण हाम्रो व्यवस्थापकले सम्पर्क गरी पुष्टि गर्नुहुनेछ।"
                />
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const Row = ({ k, v }: { k: React.ReactNode; v: React.ReactNode }) => <div className="flex justify-between gap-4"><dt className="shrink-0 text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>;
