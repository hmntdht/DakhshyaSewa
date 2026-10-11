// NEXT_PUBLIC_* must be referenced as literal member accesses so Next can inline them into the client bundle.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const env = {
  supabaseUrl: url,
  supabaseAnon: anon,
  hasSupabase: Boolean(url && anon),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  mapStyleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? '',
  mapTiles: process.env.NEXT_PUBLIC_MAP_TILES ?? '',
};

export class NotConfiguredError extends Error {
  constructor() { super('Supabase is not configured. Copy .env.example to .env.local and fill in your project keys.'); }
}
