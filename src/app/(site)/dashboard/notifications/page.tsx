import Link from 'next/link';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { RowAction } from '@/components/RowAction';
import { T } from '@/components/T';
import { EmptyState, PageTitle } from '@/components/ui';
import { markNotificationsReadAction } from '@/lib/account/actions';
import { cn, fmtDateTime } from '@/lib/utils';

export default async function NotificationsPage() {
  const { data } = await (await createClient()).from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
  const rows = (data ?? []) as { id: number; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }[];
  return (
    <>
      <PageTitle title={<T k="dash.notifications" />} action={rows.some((r) => !r.read_at) ? <RowAction action={markNotificationsReadAction}><T k="dash.mark_read" /></RowAction> : undefined} />
      {rows.length ? <ul className="space-y-2">{rows.map((n) => (
        <li key={n.id}><Link href={n.link ?? '#'} className={cn('flex items-start gap-4 rounded-app border p-4 transition hover:border-primary/60', n.read_at ? 'border-line bg-surface' : 'border-primary/40 bg-primary/10')}>
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="flex-1"><span className="block font-medium">{n.title}</span>{n.body && <span className="text-sm text-muted">{n.body}</span>}</span><span className="shrink-0 text-xs text-muted">{fmtDateTime(n.created_at)}</span></Link></li>))}</ul>
        : <EmptyState title={<T k="dash.no_notifications" />} />}
    </>
  );
}
