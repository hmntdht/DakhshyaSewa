'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Menu,
  X,
  Sparkles,
  Compass,
  Users,
  CircleHelp,
  Phone,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { useT } from '../providers';
import { LangThemeToggle } from './LangThemeToggle';

type NavItem = {
  href: string;
  k: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/services', k: 'nav.services', icon: Sparkles },
  { href: '/#how', k: 'nav.how', icon: Compass },
  { href: '/#workers', k: 'nav.workers', icon: Users },
  { href: '/#faq', k: 'nav.faq', icon: CircleHelp },
  { href: '/#contact', k: 'nav.contact', icon: Phone },
  { href: '/become-a-worker', k: 'nav.become_worker', icon: Briefcase, badge: 'Apply' },
];

export function MobileNav() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [headerBottom, setHeaderBottom] = useState(64);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track header bottom position, lock scroll, make header fully opaque, handle ESC & resize
  useEffect(() => {
    if (!open) return;

    const header = document.querySelector('header');
    const prevBg = header ? header.style.backgroundColor : '';
    const prevBackdrop = header ? header.style.backdropFilter : '';

    const updateHeaderPos = () => {
      if (header) {
        setHeaderBottom(header.getBoundingClientRect().bottom);
      }
    };

    updateHeaderPos();

    if (header) {
      header.style.backgroundColor = 'rgb(var(--c-surface))';
      header.style.backdropFilter = 'none';
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setOpen(false);
      } else {
        updateHeaderPos();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updateHeaderPos);

    return () => {
      if (header) {
        header.style.backgroundColor = prevBg;
        header.style.backdropFilter = prevBackdrop;
      }
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateHeaderPos);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="btn btn-ghost !p-2 transition-colors"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && mounted && createPortal(
        <div
          className="lg:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col"
          style={{ top: `${headerBottom}px` }}
        >
          {/* Backdrop overlay: darkened to eliminate visual noise from the underlying page and close on tap */}
          <div
            className="fixed inset-x-0 bottom-0 bg-black/60 transition-opacity animate-in fade-in duration-200"
            style={{ top: `${headerBottom}px` }}
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown Menu Panel: 100% solid, opaque surface background */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            style={{ backgroundColor: 'rgb(var(--c-surface))' }}
            className="relative z-10 w-full border-b border-line bg-surface shadow-2xl shadow-black/40 overflow-y-auto max-h-[calc(100dvh-4.5rem)] animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <div className="container-x py-3 sm:py-4 flex flex-col gap-3">
              {/* Navigation links */}
              <nav className="flex flex-col gap-0.5" aria-label="Mobile Navigation">
                {NAV_ITEMS.map(({ href, k, icon: ItemIcon, badge }) => (
                  <Link
                    key={k}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-fg hover:bg-fg/5 active:bg-fg/10 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <ItemIcon className="h-4 w-4 text-muted group-hover:text-primary transition-colors shrink-0" />
                      <span className="tracking-tight">{t(k)}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {badge && (
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          {badge}
                        </span>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-muted/40 group-hover:text-muted group-hover:translate-x-0.5 transition-transform transition-colors shrink-0" />
                    </span>
                  </Link>
                ))}
              </nav>

              {/* Divider */}
              <div className="h-px w-full bg-line/70" />

              {/* Bottom Actions */}
              <div className="flex flex-col gap-2 pt-0.5">
                <Link
                  href="/book"
                  onClick={() => setOpen(false)}
                  className="btn btn-primary w-full py-2.5 text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{t('nav.book')}</span>
                </Link>

                {/* Mobile Language and Theme controls */}
                <div className="flex items-center justify-between rounded-xl border border-line bg-elev/40 px-3.5 py-1.5">
                  <span className="text-xs font-medium text-muted">Preferences</span>
                  <LangThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
