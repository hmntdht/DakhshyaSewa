import { getOffers } from '@/lib/queries';
import { Bi, pair } from '../Bi';
import { T } from '../T';
import { CopyCode } from './CopyCode';
import { SectionHead } from './SectionHead';
import { rs } from '@/lib/utils';

export async function Offers() {
  const offers = await getOffers();
  if (!offers.length) return null;
  return (
    <section id="offers" className="border-y border-line bg-surface/40 py-20 sm:py-28">
      <div className="container-x">
        <SectionHead title={<T k="home.offers.title" />} />
        <ul className="grid gap-5 md:grid-cols-2">
          {offers.map((o) => (
            <li key={o.id} className="d-shape-sm relative flex flex-col gap-5 overflow-hidden border border-dashed border-primary/50 bg-bg p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
              <div>
                <p className="text-4xl font-extralight tracking-tight text-primary sm:text-5xl">{o.discount_type === 'percent' ? `${o.discount_value}%` : rs(o.discount_value)} <span className="text-lg font-normal text-muted"><T k="home.offers.off" /></span></p>
                <h3 className="mt-3 text-lg font-medium"><Bi v={pair(o.title_en, o.title_ne)} /></h3>
                {o.description_en && <p className="mt-1 text-sm text-muted"><Bi v={pair(o.description_en, o.description_ne)} /></p>}
              </div>
              <CopyCode code={o.code} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
