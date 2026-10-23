import Link from 'next/link';
import { getSiteConfig } from '@/lib/config';
import { Logo } from '../Logo';
import { T } from '../T';
import { AuthNav } from './AuthNav';
import { LangThemeToggle } from './LangThemeToggle';
import { MobileNav } from './MobileNav';

const LINKS = [['/services', 'nav.services'], ['/#how', 'nav.how'], ['/#workers', 'nav.workers'], ['/#faq', 'nav.faq'], ['/#contact', 'nav.contact']] as const;

export async function Header() {
  const cfg = await getSiteConfig();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-3">
        <Link href="/" aria-label="Daksha Sewa home" className="shrink-0 text-fg"><Logo logoUrl={cfg.brand.logo_url} className="h-9" /></Link>
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {LINKS.map(([href, k]) => <Link key={k} href={href} prefetch={true} className="rounded-full px-3.5 py-2 text-sm text-muted transition hover:bg-fg/5 hover:text-fg"><T k={k} /></Link>)}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <LangThemeToggle className="hidden sm:flex" />
          <AuthNav />
          <Link href="/book" prefetch={true} className="btn btn-primary btn-sm hidden md:inline-flex"><T k="nav.book" /></Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
