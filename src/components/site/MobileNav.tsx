'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useT } from '../providers';

const LINKS = [['/services', 'nav.services'], ['/#how', 'nav.how'], ['/#workers', 'nav.workers'], ['/#faq', 'nav.faq'], ['/#contact', 'nav.contact'], ['/become-a-worker', 'nav.become_worker']] as const;

export function MobileNav() {
  const t = useT(); const [open, setOpen] = useState(false);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" className="btn btn-ghost !p-2" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg" role="dialog" aria-modal="true">
          <div className="flex h-16 items-center justify-end px-5"><button type="button" className="btn btn-ghost !p-2" aria-label="Close" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></div>
          <nav className="container-x flex flex-1 flex-col gap-1 pb-10">
            {LINKS.map(([href, k]) => (
              <Link key={k} href={href} onClick={() => setOpen(false)} className="border-b border-line py-4 text-2xl font-medium tracking-tight">{t(k)}</Link>
            ))}
            <Link href="/book" onClick={() => setOpen(false)} className="btn btn-primary btn-lg mt-8">{t('nav.book')}</Link>
          </nav>
        </div>
      )}
    </div>
  );
}
