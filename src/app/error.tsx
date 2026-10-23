'use client';
import { useEffect } from 'react';
import { useT } from '@/components/providers';
import { reportError } from '@/lib/monitoring';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    // If a chunk load failed (e.g. dev server restarted or new deployment hash),
    // automatically hard-reload once to fetch fresh assets.
    if (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk') || error.message?.includes('ChunkLoadError')) {
      const key = `chunk_reload_${window.location.pathname}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return;
      }
    }
    reportError(error, { digest: error.digest, path: typeof window !== 'undefined' ? window.location.pathname : undefined });
  }, [error]);

  const handleRetry = () => {
    sessionStorage.clear();
    window.location.reload();
  };

  return (
    <div className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-3xl font-light">{t('error.title')}</h1>
        <p className="mt-3 text-muted">{error.message?.includes('Supabase is not configured') ? error.message : t('error.sub')}</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-muted">ref {error.digest}</p>}
        <button onClick={handleRetry} className="btn btn-primary mt-8">{t('error.retry')}</button>
      </div>
    </div>
  );
}
