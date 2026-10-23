'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const GROUPS: { title: string; items: [string, string][] }[] = [
  { title: 'Overview', items: [['/admin', 'Dashboard']] },
  { title: 'Operations', items: [['/admin/bookings', 'Bookings'], ['/admin/workers', 'Workers'], ['/admin/users', 'Users'], ['/admin/disputes', 'Disputes'], ['/admin/enquiries', 'Enquiries']] },
  { title: 'Content', items: [['/admin/content/categories', 'Services'], ['/admin/content/offers', 'Offers & codes'], ['/admin/content/testimonials', 'Testimonials'], ['/admin/content/faqs', 'FAQ'], ['/admin/content/pages', 'Pages'], ['/admin/content/contracts', 'Agreement'], ['/admin/content/areas', 'Service areas']] },
  { title: 'Look & settings', items: [['/admin/settings/theme', 'Theme & colours'], ['/admin/settings/brand', 'Brand & logo'], ['/admin/settings/hero', 'Home hero'], ['/admin/settings/layout', 'Home layout'], ['/admin/settings/announcement', 'Announcement bar'], ['/admin/settings/copy', 'UI text (EN/NE)'], ['/admin/settings/contact', 'Contact details'], ['/admin/settings/seo', 'SEO'], ['/admin/settings/booking', 'Booking rules & fees'], ['/admin/settings/payments', 'Payments'], ['/admin/settings/features', 'Feature switches']] },
  { title: 'Security', items: [['/admin/audit', 'Audit log']] },
];

export function AdminNav() {
  const path = usePathname(); const [open, setOpen] = useState(false);
  const list = (
    <nav aria-label="Admin" className="space-y-6 p-4">
      {GROUPS.map((g) => (
        <div key={g.title}><p className="mb-2 px-3 text-xs font-semibold text-muted/80">{g.title}</p>
          <ul className="space-y-0.5">{g.items.map(([href, label]) => { const on = href === '/admin' ? path === href : path === href || path.startsWith(`${href}/`); return (
            <li key={href}><Link href={href} prefetch={true} onClick={() => setOpen(false)} aria-current={on ? 'page' : undefined} className={cn('block rounded-lg px-3 py-2 text-sm transition', on ? 'bg-primary/15 font-medium text-primary' : 'text-muted hover:bg-fg/5 hover:text-fg')}>{label}</Link></li>); })}</ul></div>))}
    </nav>
  );
  return (
    <>
      <button type="button" className="btn btn-outline btn-sm m-4 lg:hidden" onClick={() => setOpen(true)}><Menu className="h-4 w-4" />Menu</button>
      {open && <div className="fixed inset-0 z-50 overflow-y-auto bg-bg lg:hidden"><div className="flex justify-end p-3"><button type="button" className="btn btn-ghost !p-2" onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button></div>{list}</div>}
      <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] overflow-y-auto border-r border-line lg:block">{list}</aside>
    </>
  );
}
