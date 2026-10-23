import Link from 'next/link';
import { Facebook, Instagram, MapPin, Phone, MessageCircle, Clock } from 'lucide-react';
import { getSiteConfig } from '@/lib/config';
import { getCategories } from '@/lib/queries';
import { Logo } from '../Logo';
import { Bi } from '../Bi';
import { T } from '../T';
import { LangThemeToggle } from './LangThemeToggle';
import { telHref, waHref } from '@/lib/utils';

export async function Footer() {
  const [cfg, cats] = await Promise.all([getSiteConfig(), getCategories()]);
  const c = cfg.contact;
  const link = 'text-sm text-muted transition hover:text-fg';
  return (
    <footer className="mt-24 border-t border-line bg-surface/30">
      <div className="container-x grid gap-12 py-14 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <Logo logoUrl={cfg.brand.logo_url} className="h-14" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted"><Bi en={cfg.brand.tagline_en} ne={cfg.brand.tagline_ne} /></p>
          <p className="mt-2 text-sm text-muted"><Bi en={cfg.brand.city_en} ne={cfg.brand.city_ne} /></p>
          <div className="mt-6 flex gap-2">
            {c.facebook && <a href={c.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="btn btn-outline !p-2.5"><Facebook className="h-4 w-4" /></a>}
            {c.instagram && <a href={c.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="btn btn-outline !p-2.5"><Instagram className="h-4 w-4" /></a>}
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold"><T k="nav.services" /></h3>
          <ul className="space-y-2.5">{cats.slice(0, 6).map((s) => <li key={s.id}><Link className={link} href={`/services/${s.slug}`}><Bi en={s.name_en} ne={s.name_ne} /></Link></li>)}</ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold"><T k="footer.company" /></h3>
          <ul className="space-y-2.5">
            <li><Link className={link} href="/p/about"><T k="footer.about" /></Link></li>
            <li><Link className={link} href="/become-a-worker"><T k="nav.become_worker" /></Link></li>
            <li><Link className={link} href="/p/terms"><T k="footer.terms" /></Link></li>
            <li><Link className={link} href="/p/privacy"><T k="footer.privacy" /></Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold"><T k="footer.contact" /></h3>
          <ul className="space-y-3 text-sm text-muted">
            {c.phone_primary && <li className="flex items-center gap-2.5"><Phone className="h-4 w-4 shrink-0 text-primary" /><a className="hover:text-fg" href={telHref(c.phone_primary)}>{c.phone_primary}</a>{c.phone_secondary && <> <span aria-hidden>/</span> <a className="hover:text-fg" href={telHref(c.phone_secondary)}>{c.phone_secondary}</a></>}</li>}
            {c.whatsapp && <li className="flex items-center gap-2.5"><MessageCircle className="h-4 w-4 shrink-0 text-primary" /><a className="hover:text-fg" href={waHref(c.whatsapp, 'Hello Daksha Sewa')} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
            <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><Bi en={c.address_en} ne={c.address_ne} /></span></li>
            <li className="flex gap-2.5"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><Bi en={c.hours_en} ne={c.hours_ne} /></span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-wrap items-center justify-between gap-4 py-5 text-xs text-muted">
          <span>© {new Date().getFullYear()} <Bi en={cfg.brand.name_en} ne={cfg.brand.name_ne} />. <T k="footer.rights" /></span>
          <LangThemeToggle />
        </div>
      </div>
    </footer>
  );
}
