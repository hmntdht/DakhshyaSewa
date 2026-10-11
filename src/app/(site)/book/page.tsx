import type { Metadata } from 'next';
import { BookingWizard } from '@/components/booking/BookingWizard';
import { getSiteConfig } from '@/lib/config';
import { getActiveContract, getCategories, getServiceAreas, getWorkerPublic } from '@/lib/queries';
import { requireUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import type { SavedAddress } from '@/types/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Book a service', robots: { index: false } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined);
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === 'string') as [string, string][]).toString();
  const profile = await requireUser(`/book${qs ? `?${qs}` : ''}`);

  const sb = await createClient();
  const workerId = one('worker') && UUID.test(one('worker')!) ? one('worker')! : undefined;
  const [cfg, categories, areas, contract, addr, preWorker] = await Promise.all([
    getSiteConfig(), getCategories(), getServiceAreas(), getActiveContract(),
    sb.from('saved_addresses').select('*').order('is_default', { ascending: false }).order('created_at', { ascending: false }),
    workerId ? getWorkerPublic(workerId) : Promise.resolve(null),
  ]);
  const service = one('service') ?? categories.find((c) => c.id === preWorker?.worker_services?.[0]?.category_id)?.slug;

  return (
    <BookingWizard
      categories={categories} areas={areas} contract={contract} addresses={(addr.data ?? []) as SavedAddress[]}
      me={{ name: profile.full_name ?? '', phone: profile.phone ?? '' }}
      rules={{ minNoticeHours: cfg.booking.min_notice_hours, maxAdvanceDays: cfg.booking.max_advance_days }}
      payments={cfg.payments.enabled} bookingsOpen={cfg.features.bookings_open}
      initial={{ service, worker: preWorker ? workerId : undefined }}
    />
  );
}
