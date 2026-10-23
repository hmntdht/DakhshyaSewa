import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Bi } from '../Bi';
import { Icon } from '../Icon';
import { StatusBadge } from '../ui';
import { fmtDateTime } from '@/lib/utils';
import type { Booking } from '@/types/db';

export function BookingRow({ b, href }: { b: Booking; href?: string }) {
  return (
    <li>
      <Link href={href ?? `/dashboard/bookings/${b.id}`} className="group flex items-center gap-4 rounded-app border border-line bg-surface p-4 transition hover:border-primary/60 sm:gap-5 sm:p-5">
        <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/15 text-primary sm:grid"><Icon name={b.service_categories?.icon} className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-medium"><Bi en={b.service_categories?.name_en} ne={b.service_categories?.name_ne} /></span><StatusBadge status={b.status} /></span>
          <span className="mt-1 block text-sm text-muted">{fmtDateTime(b.scheduled_start)} · {b.workers?.display_name ?? b.customer_name}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">{b.code} · {b.address_text}</span>
        </span>
        <span className="text-right"><span className="block text-xs font-medium text-muted">{b.quantity}h</span></span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted transition group-hover:text-primary" aria-hidden />
      </Link>
    </li>
  );
}
