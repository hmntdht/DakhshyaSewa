import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { T } from '../T';
import { SectionHead } from './SectionHead';

const STEPS = ['s1', 's2', 's3', 's4'] as const;

export function HowItWorks() {
  return (
    <section id="how" className="border-y border-line bg-surface/40 py-20 sm:py-28">
      <div className="container-x grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHead title={<T k="home.how.title" />} sub={<T k="home.how.sub" />} />
          <Link href="/book" className="btn btn-primary btn-lg -mt-4"><T k="nav.book" /></Link>
        </div>
        {/* the sequence is drawn as a route: dots are stops, the last stop is the pin */}
        <ol className="relative space-y-12 pl-12 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-gradient-to-b before:from-primary before:via-line before:to-transparent">
          {STEPS.map((s, i) => (
            <li key={s} className="relative">
              <span className="absolute -left-12 top-0 grid h-8 w-8 place-items-center rounded-full border border-primary bg-bg text-sm font-semibold text-primary">
                {i === STEPS.length - 1 ? <MapPin className="h-4 w-4" aria-hidden /> : i + 1}
              </span>
              <h3 className="text-2xl font-medium tracking-tight"><T k={`home.how.${s}.t`} /></h3>
              <p className="mt-2 max-w-md leading-relaxed text-muted"><T k={`home.how.${s}.d`} /></p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
