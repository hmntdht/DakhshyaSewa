import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage } from '@/lib/queries';
import { Bi, pair } from '@/components/Bi';
import { Prose } from '@/components/Prose';

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPage((await params).slug);
  return p ? { title: p.title_en } : {};
}

export default async function ContentPage({ params }: Props) {
  const p = await getPage((await params).slug);
  if (!p) notFound();
  return (
    <article className="container-x py-14 sm:py-20">
      <h1 className="max-w-2xl text-balance text-4xl font-light tracking-tight sm:text-6xl"><Bi v={pair(p.title_en, p.title_ne)} /></h1>
      <Prose en={p.body_en} ne={p.body_ne} />
    </article>
  );
}
