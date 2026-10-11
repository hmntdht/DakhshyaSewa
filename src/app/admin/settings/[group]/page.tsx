import { notFound } from 'next/navigation';
import { CopyEditor } from '@/components/admin/CopyEditor';
import { HomeLayoutEditor } from '@/components/admin/HomeLayoutEditor';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { ThemeEditor } from '@/components/admin/ThemeEditor';
import { PageTitle } from '@/components/ui';
import { SETTINGS_BY_KEY } from '@/lib/admin/settings-schema';
import { DEFAULT_CONFIG } from '@/lib/config/defaults';
import { HOME_SECTION_IDS, type SiteConfig } from '@/lib/config/types';
import { COPY_DEFAULTS } from '@/lib/i18n/copy';
import { createClient } from '@/lib/supabase/server';
import { deepMerge } from '@/lib/utils';

export default async function SettingsPage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  const special = ['theme', 'layout', 'copy'].includes(group);
  if (!special && !SETTINGS_BY_KEY[group]) notFound();
  // read straight from the DB (not the cache) so the editor always shows what is really stored
  const { data } = await (await createClient()).from('site_settings').select('key,value');
  const cfg = structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>;
  for (const r of data ?? []) cfg[r.key] = deepMerge(cfg[r.key], r.value);
  const c = cfg as unknown as SiteConfig;

  if (group === 'theme') return <><PageTitle title="Theme & colours" sub="Change the look of the whole site. Previews update as you edit; Save publishes instantly to every visitor, with no redeploy." /><ThemeEditor initial={c.theme} /></>;
  if (group === 'layout') {
    const have = c.home_layout.sections; const full = [...have, ...HOME_SECTION_IDS.filter((id) => !have.some((s) => s.id === id)).map((id) => ({ id, enabled: false }))];
    return <><PageTitle title="Home layout" sub="Choose which sections appear on the home page and in what order." /><HomeLayoutEditor initial={full} /></>;
  }
  if (group === 'copy') return <><PageTitle title="UI text (English / नेपाली)" sub="Every button, label and heading across the site, booking flow and worker/customer apps. Edit a line and it changes everywhere." /><CopyEditor defaults={COPY_DEFAULTS} initial={c.copy} /></>;
  const g = SETTINGS_BY_KEY[group];
  return <><PageTitle title={g.title} sub={g.hint} /><SettingsForm group={g} value={(cfg[g.storeKey] ?? {}) as Record<string, unknown>} /></>;
}
