import { Bi } from './Bi';
import { getCopy } from '@/lib/config';

/** Server-side translated string from the admin-editable copy table. Usage: <T k="nav.services" /> */
export async function T({ k, className }: { k: string; className?: string }) {
  const copy = await getCopy();
  return <Bi v={copy[k] ?? { en: k, ne: k }} className={className} />;
}
