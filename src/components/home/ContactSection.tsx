import { Clock, MessageCircle, Phone } from 'lucide-react';
import { getSiteConfig } from '@/lib/config';
import { getCategories } from '@/lib/queries';
import { submitEnquiry } from '@/app/(site)/actions';
import { Bi } from '../Bi';
import { T } from '../T';
import { ActionForm, SubmitButton } from '../form';
import { Field } from '../ui';
import { SectionHead } from './SectionHead';
import { telHref, waHref } from '@/lib/utils';

export async function ContactSection() {
  const [{ contact: c }, cats] = await Promise.all([getSiteConfig(), getCategories()]);
  const row = 'flex items-center gap-4 rounded-app border border-line bg-surface p-4 transition hover:border-primary/60';
  return (
    <section id="contact" className="container-x py-20 sm:py-28">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <SectionHead title={<T k="home.contact.title" />} sub={<T k="home.contact.sub" />} />
          <div className="-mt-4 space-y-3">
            {c.phone_primary && <a href={telHref(c.phone_primary)} className={row}><span className="grid h-11 w-11 place-items-center rounded-full bg-primary/15 text-primary"><Phone className="h-5 w-5" /></span><span><span className="block text-xs text-muted"><T k="home.contact.call" /></span><span className="text-xl font-semibold">{c.phone_primary}</span>{c.phone_secondary && <span className="text-muted"> / {c.phone_secondary}</span>}</span></a>}
            {c.whatsapp && <a href={waHref(c.whatsapp, 'Hello Daksha Sewa')} target="_blank" rel="noopener noreferrer" className={row}><span className="grid h-11 w-11 place-items-center rounded-full bg-ok/15 text-ok"><MessageCircle className="h-5 w-5" /></span><span><span className="block text-xs text-muted">WhatsApp</span><span className="text-xl font-semibold"><T k="home.contact.wa" /></span></span></a>}
            <p className="flex items-center gap-3 px-1 pt-2 text-sm text-muted"><Clock className="h-4 w-4" /><Bi en={c.hours_en} ne={c.hours_ne} /></p>
          </div>
        </div>
        <ActionForm action={submitEnquiry} resetOnSuccess className="card space-y-4 p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={<T k="enquiry.name" />}><input name="name" required minLength={2} maxLength={80} autoComplete="name" className="field" /></Field>
            <Field label={<T k="enquiry.phone" />}><input name="phone" required inputMode="tel" autoComplete="tel" pattern="[+0-9][0-9 \-]{6,18}" className="field" /></Field>
          </div>
          <Field label={<T k="enquiry.email" />}><input name="email" type="email" inputMode="email" autoComplete="email" maxLength={120} placeholder="you@example.com" className="field" /></Field>
          <Field label={<T k="enquiry.service" />}>
            <select name="service" className="field" defaultValue=""><option value="">—</option>{cats.map((s) => <option key={s.id} value={s.name_en}>{s.name_en}</option>)}</select>
          </Field>
          <Field label={<T k="enquiry.message" />}><textarea name="message" rows={3} maxLength={1000} className="field resize-none" /></Field>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          <SubmitButton className="btn-lg w-full sm:w-auto"><T k="enquiry.send" /></SubmitButton>
        </ActionForm>
      </div>
    </section>
  );
}
