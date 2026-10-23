import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  logoUrl?: string;
  /** Show "Daksha Sewa" text next to the icon. Default: true */
  withText?: boolean;
}

/**
 * Brand logo — renders the house+heart SVG mark (always in full colour) plus
 * an optional wordmark. Pass `logoUrl` to use an admin-uploaded replacement.
 *
 * The callers always size via a height Tailwind class (e.g. `h-9`, `h-11`,
 * `h-14`). We forward that class to the wrapper so it controls the icon height.
 */
export function Logo({ className, logoUrl, withText = true }: LogoProps) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="Daksha Sewa" className={cn('w-auto object-contain', className)} />;
  }

  return (
    <span className={cn('inline-flex items-center gap-2 select-none', className)}>
      {/* The img takes the full height of its flex parent */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo.svg"
        alt=""
        aria-hidden="true"
        className="h-full w-auto object-contain shrink-0"
      />
      {withText && (
        <span className="font-bold tracking-tight whitespace-nowrap leading-none">
          Daksha Sewa
        </span>
      )}
    </span>
  );
}
