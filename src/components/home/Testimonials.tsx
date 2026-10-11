import { getTestimonials } from '@/lib/queries';
import { Bi, pair } from '../Bi';
import { T } from '../T';
import { Stars } from '../ui';
import { SectionHead } from './SectionHead';

export async function Testimonials() {
  const items = await getTestimonials();
  if (!items.length) return null;
  return (
    <section id="testimonials" className="container-x py-20 sm:py-28">
      <SectionHead title={<T k="home.testimonials.title" />} />
      <div className="grid gap-x-12 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <figure key={t.id} className="border-t border-line pt-6">
            <Stars value={t.rating} />
            <blockquote className="mt-4 text-xl font-light leading-snug tracking-tight"><Bi v={pair(t.quote_en, t.quote_ne)} /></blockquote>
            <figcaption className="mt-5 text-sm text-muted"><b className="font-medium text-fg">{t.name}</b>{t.location ? `, ${t.location}` : ''}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
