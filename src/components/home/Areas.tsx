import { MapPin } from 'lucide-react';
import { getServiceAreas } from '@/lib/queries';
import { Bi } from '../Bi';
import { T } from '../T';
import { SectionHead } from './SectionHead';

export async function Areas() {
  const areas = await getServiceAreas();
  if (!areas.length) return null;
  return (
    <section id="areas" className="border-y border-line bg-surface/40 py-16 sm:py-20">
      <div className="container-x">
        <SectionHead title={<T k="home.areas.title" />} sub={<T k="home.areas.sub" />} />
        <ul className="-mt-2 flex flex-wrap gap-3">
          {areas.map((a) => (
            <li key={a.id} className="flex items-center gap-2.5 rounded-full border border-line bg-bg px-5 py-3 text-lg">
              <MapPin className="h-4 w-4 text-primary" aria-hidden /><Bi en={a.name_en} ne={a.name_ne} /><span className="text-xs text-muted">{Number(a.radius_km)} km</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
