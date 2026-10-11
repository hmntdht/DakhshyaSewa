import type { Metadata } from 'next';
import Link from 'next/link';
import { LiveRefresh } from '@/components/worker/LiveRefresh';
import { Notice } from '@/components/ui';
import { T } from '@/components/T';
import { requireWorker } from '@/lib/auth/session';

// Private area: always rendered per request (never prerendered or cached across users).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Worker portal', robots: { index: false } };

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { worker } = await requireWorker('/worker');
  const tone = worker.status === 'pending' ? 'warn' : 'error';
  return (
    <div className="container-x py-10 sm:py-14">
      <nav className="mb-8 flex items-center gap-1 border-b border-line text-sm">
        <Link href="/worker" className="px-4 py-3 text-muted hover:text-fg"><T k="worker.nav.jobs" /></Link>
        <Link href="/worker/profile" className="px-4 py-3 text-muted hover:text-fg"><T k="worker.nav.profile" /></Link>
      </nav>
      {worker.status !== 'approved' && <Notice tone={tone} className="mb-8"><T k={`worker.status.${worker.status}`} /></Notice>}
      {worker.status === 'approved' && <LiveRefresh />}
      {children}
    </div>
  );
}
