import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { getCategories } from '@/lib/queries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cats = await getCategories();
  const now = new Date();
  return [
    { url: env.siteUrl, lastModified: now, priority: 1 },
    { url: `${env.siteUrl}/services`, lastModified: now, priority: 0.9 },
    ...cats.map((c) => ({ url: `${env.siteUrl}/services/${c.slug}`, lastModified: now, priority: 0.8 })),
    ...['about', 'terms', 'privacy'].map((s) => ({ url: `${env.siteUrl}/p/${s}`, lastModified: now, priority: 0.3 })),
  ];
}
