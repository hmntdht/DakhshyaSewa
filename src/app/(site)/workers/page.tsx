import type { Metadata } from 'next';
import { getCategories, getServiceAreas } from '@/lib/queries';
import { PageTitle } from '@/components/ui';
import { WorkerSearch } from '@/components/site/WorkerSearch';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Find Workers Near You',
  description: 'Search for verified household service workers in your area in Kailali, Nepal.',
};

export default async function WorkersPage() {
  const [cats, areas] = await Promise.all([getCategories(), getServiceAreas()]);

  return (
    <div className="container-x py-14 sm:py-20">
      <PageTitle
        title="Find Workers Near You"
        sub="Pick your location to see workers whose service area covers it"
      />
      <div className="mt-10 max-w-3xl">
        <WorkerSearch
          categories={cats.filter((c) => !c.id.startsWith('fallback'))}
          areas={areas}
        />
      </div>
    </div>
  );
}
