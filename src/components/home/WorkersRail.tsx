import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { getCategories, getFeaturedWorkers } from '@/lib/queries';
import { T } from '../T';
import { WorkerCard } from '../WorkerCard';
import { SectionHead } from './SectionHead';

export async function WorkersRail() {
  const [workers, cats] = await Promise.all([getFeaturedWorkers(), getCategories()]);
  return (
    <section id="workers" className="py-20 sm:py-28">
      <div className="container-x">
        <SectionHead title={<T k="home.workers.title" />} sub={<T k="home.workers.sub" />}
          action={<Link href="/become-a-worker" className="btn btn-outline"><UserPlus className="h-4 w-4" /><T k="nav.become_worker" /></Link>} />
        {workers.length > 0 ? (
          <ul className="rail -mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8">
            {workers.map((w) => <li key={w.id} className="w-[19rem] shrink-0 snap-start sm:w-[21rem]"><WorkerCard worker={w} categories={cats} /></li>)}
          </ul>
        ) : (
          <div className="d-shape flex flex-col items-start gap-5 border border-line bg-surface p-8 sm:p-12">
            <h3 className="max-w-lg text-2xl font-light tracking-tight sm:text-3xl"><T k="home.workers.empty.title" /></h3>
            <p className="max-w-lg text-muted"><T k="home.workers.empty.sub" /></p>
            <Link href="/become-a-worker" className="btn btn-primary"><T k="home.workers.join" /></Link>
          </div>
        )}
      </div>
    </section>
  );
}
