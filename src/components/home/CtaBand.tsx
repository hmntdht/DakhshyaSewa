import Link from 'next/link';
import { T } from '../T';

/** The poster's closing banner: a cream pill with a peach pill inside it. */
export function CtaBand() {
  return (
    <section className="container-x pt-8">
      <div className="flex flex-col items-stretch gap-3 rounded-[2rem] bg-fg p-3 text-bg sm:flex-row sm:items-center sm:rounded-full sm:p-2.5 sm:pl-10">
        <p className="px-3 pt-2 text-xl font-semibold tracking-tight sm:flex-1 sm:p-0 sm:text-2xl"><T k="cta.line1" /></p>
        <Link href="/book" className="flex items-center justify-center rounded-full bg-primary px-8 py-4 text-center text-lg font-bold text-primary-fg transition hover:brightness-105 sm:py-3.5">
          <span lang="ne" className="font-ne"><T k="cta.line2" /></span>
        </Link>
      </div>
    </section>
  );
}
