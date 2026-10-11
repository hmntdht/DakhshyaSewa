import Image from 'next/image';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import { getSiteConfig } from '@/lib/config';
import { Bi } from '../Bi';
import { T } from '../T';
import { telHref } from '@/lib/utils';

/** Always dark (data-theme="dark" scope), like the launch poster. English line is hairline-light, Nepali line is heavy: the same contrast as the logo vs the wordmark. */
export async function Hero() {
  const { hero: h, contact } = await getSiteConfig();
  return (
    <section data-theme="dark" className="hero-lines relative overflow-hidden bg-bg text-fg">
      <div aria-hidden className="pointer-events-none absolute -right-32 top-10 h-[34rem] w-[34rem] rounded-full bg-primary/10 blur-[110px]" />
      <div className="container-x relative grid items-center gap-10 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-24 lg:pt-24">
        <div>
          <p className="inline-flex items-center gap-2.5 rounded-full border border-line px-3.5 py-1.5 text-[13px] text-muted">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary" /><span className="relative h-2 w-2 rounded-full bg-primary" /></span>
            <Bi en={h.eyebrow_en} ne={h.eyebrow_ne} />
          </p>
          <h1 className="mt-7 text-balance">
            <span className="block text-[clamp(2.6rem,6.4vw,5.4rem)] font-extralight leading-[1] tracking-[-0.03em]">{h.title_en}</span>
            <span lang="ne" className="font-ne mt-2 block text-[clamp(2.3rem,5.6vw,4.7rem)] font-extrabold leading-[1.12] text-primary">{h.title_ne}</span>
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-muted"><Bi en={h.subtitle_en} ne={h.subtitle_ne} /></p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/book" className="btn btn-primary btn-lg"><Bi en={h.cta_primary_en} ne={h.cta_primary_ne} /></Link>
            <Link href="#how" className="btn btn-outline btn-lg"><Bi en={h.cta_secondary_en} ne={h.cta_secondary_ne} /></Link>
          </div>
          {contact.phone_primary && (
            <a href={telHref(contact.phone_primary)} className="mt-8 inline-flex items-center gap-3 text-sm text-muted transition hover:text-fg">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-line"><Phone className="h-4 w-4 text-primary" /></span>
              <span><T k="hero.call" /> <b className="font-semibold text-fg">{contact.phone_primary}</b></span>
            </a>
          )}
        </div>
        <div className="relative mx-auto w-full max-w-[640px]">
          <Image src={h.image_url || '/brand/hero-art.webp'} alt="" width={1280} height={755} priority sizes="(min-width:1024px) 600px, 92vw" className="relative h-auto w-full" />
          <div className="absolute -bottom-3 left-2 flex items-center gap-3 rounded-2xl border border-line bg-elev/90 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur sm:left-6">
            <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-ok" /><span className="relative h-3 w-3 rounded-full bg-ok" /></span>
            <div className="text-sm leading-tight"><p className="font-medium"><T k="hero.live_title" /></p><p className="text-xs text-muted"><T k="hero.live_sub" /></p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
