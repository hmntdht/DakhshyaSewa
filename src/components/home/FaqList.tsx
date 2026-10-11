import { Plus } from 'lucide-react';
import { getFaqs } from '@/lib/queries';
import { Bi, pair } from '../Bi';
import { T } from '../T';
import { SectionHead } from './SectionHead';

export async function FaqList() {
  const faqs = await getFaqs();
  if (!faqs.length) return null;
  return (
    <section id="faq" className="container-x grid gap-12 py-20 sm:py-28 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
      <SectionHead title={<T k="home.faq.title" />} sub={<T k="home.faq.sub" />} />
      <div className="divide-y divide-line border-y border-line">
        {faqs.map((f) => (
          <details key={f.id} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium [&::-webkit-details-marker]:hidden">
              <span><Bi v={pair(f.q_en, f.q_ne)} /></span>
              <Plus className="h-5 w-5 shrink-0 text-primary transition group-open:rotate-45" aria-hidden />
            </summary>
            <p className="mt-3 max-w-xl leading-relaxed text-muted"><Bi v={pair(f.a_en, f.a_ne)} /></p>
          </details>
        ))}
      </div>
    </section>
  );
}
