import 'server-only';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { env } from '@/lib/env';
import { createPublicClient } from '@/lib/supabase/public';
import { FALLBACK_CATEGORIES } from '@/lib/config/defaults';
import type { Category, Faq, Offer, PageRow, Review, ServiceArea, Testimonial, Worker } from '@/types/db';

/** Cacheable public reads. Each is tagged so the matching admin save can revalidate exactly what changed. */
async function safe<T>(fallback: T, run: () => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  if (!env.hasSupabase) return fallback;
  try {
    const { data, error } = await run();
    if (error) throw new Error(error.message);
    return (data as T) ?? fallback;
  } catch (e) { console.error('[queries]', (e as Error).message); return fallback; }
}
const db = () => createPublicClient();
const opts = (tag: string, revalidate = 300) => ({ tags: [tag], revalidate });

export const getCategories = cache(unstable_cache(
  async (): Promise<Category[]> => safe(FALLBACK_CATEGORIES as unknown as Category[], () => db().from('service_categories').select('*').eq('is_active', true).order('sort_order')),
  ['categories-v2'], opts('categories')));

export const getCategoryBySlug = cache(async (slug: string): Promise<Category | null> => {
  return unstable_cache(
    async () => safe<Category | null>(env.hasSupabase ? null : ((FALLBACK_CATEGORIES as unknown as Category[]).find((c) => c.slug === slug) ?? null), () => db().from('service_categories').select('*').eq('slug', slug).eq('is_active', true).maybeSingle()),
    ['category-v2', slug], opts('categories')
  )();
});

export const getOffers = cache(unstable_cache(
  async (): Promise<Offer[]> => safe([], () => db().from('promo_offers').select('id,code,title_en,title_ne,description_en,description_ne,discount_type,discount_value,min_order,ends_at').eq('is_active', true).eq('show_on_home', true).order('created_at', { ascending: false }).limit(3)),
  ['offers-v2'], opts('content', 120)));

export const getTestimonials = cache(unstable_cache(
  async (): Promise<Testimonial[]> => safe([], () => db().from('testimonials').select('id,name,location,quote_en,quote_ne,rating').eq('is_active', true).order('sort_order').limit(6)),
  ['testimonials-v2'], opts('content')));

export const getFaqs = cache(unstable_cache(
  async (): Promise<Faq[]> => safe([], () => db().from('faqs').select('id,q_en,q_ne,a_en,a_ne').eq('is_active', true).order('sort_order')),
  ['faqs-v2'], opts('content')));

export const getServiceAreas = cache(unstable_cache(
  async (): Promise<ServiceArea[]> => safe([], () => db().from('service_areas').select('id,name_en,name_ne,center_lat,center_lng,radius_km').eq('is_active', true).order('sort_order')),
  ['areas-v2'], opts('content')));

export const getPage = cache(async (slug: string): Promise<PageRow | null> => {
  return unstable_cache(
    async () => safe<PageRow | null>(null, () => db().from('pages').select('slug,title_en,title_ne,body_en,body_ne').eq('slug', slug).eq('is_published', true).maybeSingle()),
    ['page-v2', slug], opts('content')
  )();
});

const WORKER_COLS = 'id,display_name,display_name_ne,avatar_url,headline_en,headline_ne,bio_en,bio_ne,languages,experience_years,rating_avg,rating_count,jobs_completed,is_featured,available_days,work_start,work_end,status,is_listed';

export const getFeaturedWorkers = cache(unstable_cache(
  async (): Promise<Worker[]> => safe([], () => db().from('workers').select(`${WORKER_COLS}, worker_services(category_id, rate)`).eq('status', 'approved').eq('is_listed', true).order('is_featured', { ascending: false }).order('rating_avg', { ascending: false }).order('jobs_completed', { ascending: false }).limit(8)),
  ['featured-workers-v2'], opts('workers', 120)));

export type WorkerSort = 'rating' | 'price' | 'experience';
export const getWorkersForCategory = cache(async (categoryId: string, sort: WorkerSort = 'rating'): Promise<(Worker & { rate: number | null })[]> => {
  return unstable_cache(
    async () => {
      const rows = await safe<Worker[]>([], () => db().from('workers').select(`${WORKER_COLS}, worker_services!inner(category_id, rate)`).eq('status', 'approved').eq('is_listed', true).eq('worker_services.category_id', categoryId).limit(60));
      const withRate = rows.map((w) => ({ ...w, rate: w.worker_services?.[0]?.rate ?? null }));
      const price = (w: { rate: number | null }) => w.rate ?? Number.MAX_SAFE_INTEGER;
      return withRate.sort((a, b) =>
        sort === 'price' ? price(a) - price(b) || b.rating_avg - a.rating_avg
        : sort === 'experience' ? b.experience_years - a.experience_years
        : b.rating_avg - a.rating_avg || b.jobs_completed - a.jobs_completed);
    },
    ['workers-for-category-v2', categoryId, sort], opts('workers', 60)
  )();
});

export const getWorkerPublic = cache(async (id: string): Promise<(Worker & { worker_services: { category_id: string; rate: number | null }[] }) | null> => {
  return unstable_cache(
    async () => safe(null, () => db().from('workers').select(`${WORKER_COLS}, worker_services(category_id, rate)`).eq('id', id).eq('status', 'approved').eq('is_listed', true).maybeSingle()),
    ['worker-public-v2', id], opts('workers', 60)
  )();
});

export const getWorkerReviews = cache(async (workerId: string): Promise<Review[]> => {
  return unstable_cache(
    async () => safe([], () => db().from('reviews').select('id,booking_id,reviewer_name,rating,comment,created_at').eq('worker_id', workerId).eq('is_public', true).order('created_at', { ascending: false }).limit(20)),
    ['worker-reviews-v2', workerId], opts('workers', 60)
  )();
});

export const getActiveContract = cache(unstable_cache(
  async () => safe<import('@/types/db').ContractTemplate | null>(null, () => db().from('contract_templates').select('id,title_en,title_ne,body_en,body_ne,version').eq('kind', 'service_agreement').eq('is_active', true).order('version', { ascending: false }).limit(1).maybeSingle()),
  ['contract-v2'], opts('content')));
