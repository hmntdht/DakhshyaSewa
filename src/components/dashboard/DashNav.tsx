'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '../providers';
import { cn } from '@/lib/utils';

const TABS = [['/dashboard', 'dash.overview'], ['/dashboard/bookings', 'dash.bookings'], ['/dashboard/addresses', 'dash.addresses'], ['/dashboard/payments', 'dash.payments'], ['/dashboard/notifications', 'dash.notifications'], ['/dashboard/settings', 'dash.settings']] as const;

export function DashNav({ unread }: { unread: number }) {
  const t = useT(); const path = usePathname();
  return (
    <nav aria-label="Account" className="rail -mx-5 mb-10 flex gap-1 overflow-x-auto border-b border-line px-5 sm:mx-0 sm:px-0">
      {TABS.map(([href, k]) => {
        const on = href === '/dashboard' ? path === href : path.startsWith(href);
        return <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={cn('relative shrink-0 px-4 py-3 text-sm transition', on ? 'text-fg after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary' : 'text-muted hover:text-fg')}>{t(k)}{href.endsWith('notifications') && unread > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-fg">{unread}</span>}</Link>;
      })}
    </nav>
  );
}
