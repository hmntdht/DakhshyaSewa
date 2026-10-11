'use client';
import { useEffect } from 'react';
import { useT } from '@/components/providers';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-3xl font-light">{t('error.title')}</h1>
        <p className="mt-3 text-muted">{error.message?.includes('Supabase is not configured') ? error.message : t('error.sub')}</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-muted">ref {error.digest}</p>}
        <button onClick={reset} className="btn btn-primary mt-8">{t('error.retry')}</button>
      </div>
    </div>
  );
}
