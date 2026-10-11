'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutDashboard, LogOut, Shield, Briefcase } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { env } from '@/lib/env';
import { useT } from '../providers';
import { Avatar } from '../ui';

type Me = { role: 'customer' | 'worker' | 'admin'; name: string } | null | 'loading';

/**
 * Auth state lives in the browser so the header can sit inside statically cached pages.
 * (A server header that read cookies would force every page to render dynamically.)
 */
export function AuthNav() {
  const t = useT();
  const [me, setMe] = useState<Me>('loading');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!env.hasSupabase) { setMe(null); return; }
    const sb = createClient(); let alive = true;
    const load = async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { if (alive) setMe(null); return; }
      const { data } = await sb.from('profiles').select('role,full_name').eq('id', session.user.id).maybeSingle();
      if (alive) setMe({ role: (data?.role ?? 'customer') as 'customer', name: data?.full_name ?? session.user.email ?? '' });
    };
    load();
    const { data: sub } = sb.auth.onAuthStateChange((e) => { if (e === 'SIGNED_OUT') setMe(null); if (e === 'SIGNED_IN') load(); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  if (me === 'loading') return <span className="h-9 w-24 animate-pulse rounded-full bg-fg/5" aria-hidden />;
  if (!me) return (
    <div className="flex items-center gap-1.5">
      <Link href="/login" className="btn btn-ghost btn-sm">{t('nav.login')}</Link>
      <Link href="/signup" className="btn btn-primary btn-sm hidden sm:inline-flex">{t('nav.signup')}</Link>
    </div>
  );
  const item = 'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-fg/5 hover:text-fg';
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-2.5 text-sm transition hover:border-fg/40">
        <Avatar name={me.name} size={28} /><span className="hidden max-w-[7rem] truncate sm:block">{me.name.split(' ')[0]}</span><ChevronDown className="h-3.5 w-3.5 text-muted" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-56 rounded-app border border-line bg-elev p-1.5 shadow-2xl shadow-black/40">
          <Link role="menuitem" href="/dashboard" className={item} onClick={() => setOpen(false)}><LayoutDashboard className="h-4 w-4" />{t('nav.dashboard')}</Link>
          {(me.role === 'worker') && <Link role="menuitem" href="/worker" className={item} onClick={() => setOpen(false)}><Briefcase className="h-4 w-4" />{t('nav.worker_portal')}</Link>}
          {me.role === 'admin' && <Link role="menuitem" href="/admin" className={item} onClick={() => setOpen(false)}><Shield className="h-4 w-4" />{t('nav.admin')}</Link>}
          <form action="/auth/signout" method="post"><button role="menuitem" className={`${item} w-full`}><LogOut className="h-4 w-4" />{t('nav.logout')}</button></form>
        </div>
      )}
    </div>
  );
}
