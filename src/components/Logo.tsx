import { cn } from '@/lib/utils';

/** Uses the traced SVG (inherits text colour, so it works on dark and light) unless the admin uploads a logo. */
export function Logo({ className, logoUrl }: { className?: string; logoUrl?: string }) {
  if (logoUrl) return <img src={logoUrl} alt="Daksha Sewa" className={cn('h-10 w-auto', className)} />;
  return <span role="img" aria-label="Daksha Sewa" className={cn('ds-logo h-10', className)} />;
}
