import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { AdminNav } from '@/components/admin/AdminNav';
import { Logo } from '@/components/Logo';
import { LangThemeToggle } from '@/components/site/LangThemeToggle';
import { requireAdmin } from '@/lib/auth/session';

// Private area: always rendered per request (never prerendered or cached across users).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s | Admin' }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-4"><Link href="/admin" aria-label="Admin home" className="text-fg"><Logo className="h-8" /></Link><span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">Admin</span></div>
        <div className="flex items-center gap-3 text-sm"><span className="hidden text-muted sm:block">{me.full_name ?? me.email}</span><LangThemeToggle className="hidden sm:flex" /><Link href="/" target="_blank" className="btn btn-outline btn-sm"><ExternalLink className="h-3.5 w-3.5" />View site</Link></div>
      </header>
      <div className="lg:grid lg:grid-cols-[16rem_1fr]"><AdminNav /><main className="min-w-0 p-5 sm:p-8">{children}</main></div>
    </div>
  );
}
