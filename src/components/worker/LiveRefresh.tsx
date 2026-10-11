'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

/** New requests / status changes appear without reloading. Realtime (RLS-filtered) with a slow polling fallback. */
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const sb = createClient();
    const ch = sb.channel('worker-bookings').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => router.refresh()).subscribe();
    const poll = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, 45_000);
    return () => { clearInterval(poll); sb.removeChannel(ch); };
  }, [router]);
  return null;
}
