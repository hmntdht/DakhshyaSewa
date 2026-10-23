/**
 * Centralized Application Monitoring & Error Reporting
 * Captures uncaught client/server exceptions and reports to Sentry or custom monitoring endpoint.
 */

interface ErrorContext {
  digest?: string;
  componentStack?: string;
  userId?: string;
  path?: string;
  [key: string]: unknown;
}

export function reportError(error: Error | unknown, context?: ErrorContext): void {
  const isProd = process.env.NODE_ENV === 'production';
  const err = error instanceof Error ? error : new Error(String(error));

  const payload = {
    message: err.message,
    name: err.name,
    stack: err.stack,
    digest: context?.digest,
    path: typeof window !== 'undefined' ? window.location.pathname : context?.path,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // 1. Always log to console in local/dev or formatted in prod
  if (isProd) {
    console.error('[CRASH_MONITOR]', JSON.stringify(payload));
  } else {
    console.error('[Error Monitoring]', err, context);
  }

  // 2. If Sentry or an external telemetry endpoint is configured, forward the incident
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (sentryDsn && typeof window !== 'undefined') {
    try {
      // Future Sentry captureException integration
      if ((window as unknown as { Sentry?: { captureException: (e: unknown, extra: unknown) => void } }).Sentry) {
        (window as unknown as { Sentry: { captureException: (e: unknown, extra: unknown) => void } }).Sentry.captureException(err, { extra: payload });
      }
    } catch {
      // Silent error handler failure
    }
  }
}
