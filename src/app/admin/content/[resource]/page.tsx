import { notFound } from 'next/navigation';
import { ResourceManager } from '@/components/admin/ResourceManager';
import { PageTitle } from '@/components/ui';
import { RESOURCES } from '@/lib/admin/resources';
import { createClient } from '@/lib/supabase/server';

export default async function ContentPage({ params }: { params: Promise<{ resource: string }> }) {
  const def = RESOURCES[(await params).resource];
  if (!def) notFound();
  const sb = await createClient();
  const [{ data }, { data: cats }] = await Promise.all([sb.from(def.table).select('*').order(def.order.column, { ascending: def.order.asc }), sb.from('service_categories').select('id,name_en').order('sort_order')]);
  return (
    <>
      <PageTitle title={def.title} />
      <ResourceManager def={def} rows={(data ?? []) as Record<string, unknown>[]} lookups={{ categories: (cats ?? []).map((c: { id: string; name_en: string }) => ({ value: c.id, label: c.name_en })) }} />
    </>
  );
}
