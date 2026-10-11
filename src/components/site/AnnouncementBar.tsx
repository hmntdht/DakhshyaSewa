import Link from 'next/link';
import { Bi } from '../Bi';
import { getSiteConfig } from '@/lib/config';

export async function AnnouncementBar() {
  const { announcement: a } = await getSiteConfig();
  if (!a.enabled || !a.text_en) return null;
  const inner = <span className="mx-auto max-w-page px-4 text-center text-[13px] leading-tight"><Bi en={a.text_en} ne={a.text_ne} /></span>;
  return (
    <div className="flex min-h-9 items-center bg-primary py-1.5 text-primary-fg">
      {a.link && /^\/(?!\/)/.test(a.link) ? <Link href={a.link} className="flex w-full justify-center hover:underline">{inner}</Link> : inner}
    </div>
  );
}
