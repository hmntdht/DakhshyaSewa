import Link from 'next/link';
import { getSiteConfig } from '@/lib/config';
import { Logo } from '@/components/Logo';
import { LangThemeToggle } from '@/components/site/LangThemeToggle';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const cfg = await getSiteConfig();
  return (
    <div className="hero-lines flex min-h-dvh flex-col">
      <header className="container-x flex h-20 items-center justify-between">
        <Link href="/" aria-label="Daksha Sewa home"><Logo logoUrl={cfg.brand.logo_url} className="h-11" /></Link>
        <LangThemeToggle />
      </header>
      <main className="container-x flex flex-1 items-start justify-center pb-16 pt-4 sm:items-center">{children}</main>
    </div>
  );
}
