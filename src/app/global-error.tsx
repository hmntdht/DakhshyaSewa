'use client';
import { useEffect } from 'react';
import { reportError } from '@/lib/monitoring';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { digest: error.digest, scope: 'global-root' });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen grid place-items-center p-6 text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold mb-3">Something went wrong</h2>
          <p className="text-slate-400 mb-6">
            A critical error occurred. Our team has been notified.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 rounded-lg bg-amber-500 text-slate-950 font-medium hover:bg-amber-400 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
