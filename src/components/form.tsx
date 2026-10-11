'use client';
import { useActionState, useEffect, useRef, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';
import { Bi } from './Bi';
import { Notice, Spinner } from './ui';
import type { ActionResult } from '@/lib/errors';

export function SubmitButton({ children, className, pendingText }: { children: ReactNode; className?: string; pendingText?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn('btn btn-primary', className)}>
      {pending && <Spinner />}{pending && pendingText ? pendingText : children}
    </button>
  );
}

/** <form> wired to a Server Action that returns ActionResult; shows success / error inline. */
export function ActionForm({ action, children, className, resetOnSuccess = false }: {
  action: (fd: FormData) => Promise<ActionResult<unknown>>; children: ReactNode; className?: string; resetOnSuccess?: boolean;
}) {
  const [state, run] = useActionState(async (_p: ActionResult<unknown> | null, fd: FormData) => action(fd), null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (resetOnSuccess && state?.ok) ref.current?.reset(); }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={run} className={className}>
      {children}
      {state && (state.ok
        ? state.message && <Notice tone="success" className="mt-4"><Bi v={state.message} /></Notice>
        : <Notice tone="error" className="mt-4"><Bi v={state.error} /></Notice>)}
    </form>
  );
}
