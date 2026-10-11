import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { env } from '@/lib/env';
import { createPublicClient } from '@/lib/supabase/public';
import { deepMerge } from '@/lib/utils';
import { DEFAULT_CONFIG } from './defaults';
import type { SiteConfig } from './types';
import { COPY_DEFAULTS } from '@/lib/i18n/copy';

/**
 * Admin-editable configuration. Cached with the `site-config` tag: saving in /admin calls
 * revalidateTag('site-config'), so changes go live within a second, with no redeploy.
 */
const loadConfig = unstable_cache(
  async (): Promise<SiteConfig> => {
    if (!env.hasSupabase) return DEFAULT_CONFIG;
    try {
      const { data, error } = await createPublicClient().from('site_settings').select('key,value');
      if (error) throw error;
      const merged = structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>;
      for (const row of data ?? []) merged[row.key] = deepMerge(merged[row.key], row.value);
      return merged as unknown as SiteConfig;
    } catch (e) {
      console.error('[config] using built-in defaults:', (e as Error).message);
      return DEFAULT_CONFIG;
    }
  },
  ['site-config-v1'],
  { tags: ['site-config'], revalidate: 300 },
);

export const getSiteConfig = cache(loadConfig);

/** Default UI strings + admin overrides (Admin → UI copy). */
export const getCopy = cache(async () => {
  const cfg = await getSiteConfig();
  return { ...COPY_DEFAULTS, ...cfg.copy } as Record<string, { en: string; ne: string }>;
});
