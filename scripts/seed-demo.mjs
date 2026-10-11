// Usage:  npm run seed:demo
// Creates DEMO accounts so you can try the full flow immediately: 1 customer + 4 approved workers.
// Do NOT run against production. Demo emails use the reserved .test domain; delete them before launch (Admin → Users → Suspend, or in Supabase Auth).
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (put them in .env.local).'); process.exit(1); }
if (process.env.NODE_ENV === 'production') { console.error('Refusing to seed demo data with NODE_ENV=production.'); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });
const PASSWORD = 'Daksha@12345';
const WORKERS = [
  { email: 'sunita@demo.dakshasewa.test', name: 'Sunita Chaudhary', ne: 'सुनिता चौधरी', phone: '9800000011', years: 6, headline: 'Thorough home cleaning, done on time', bio: 'Six years cleaning homes in Dhangadhi. I bring my own supplies and work room by room.', langs: ['Nepali', 'Tharu', 'Hindi'], svc: { 'house-cleaning': 320, 'kitchen-help': null }, featured: true },
  { email: 'maya@demo.dakshasewa.test', name: 'Maya Joshi', ne: 'माया जोशी', phone: '9800000012', years: 4, headline: 'Balloon arches, backdrops, themed tables', bio: 'I plan and set up birthday decorations at home and clean up afterwards.', langs: ['Nepali', 'English'], svc: { 'birthday-decoration': 3800 }, featured: true },
  { email: 'anita@demo.dakshasewa.test', name: 'Anita Bhatt', ne: 'अनिता भट्ट', phone: '9800000013', years: 8, headline: 'Maths & Science, classes 5 to 10', bio: 'Former school teacher. Patient, structured sessions at home or on video call.', langs: ['Nepali', 'English', 'Hindi'], svc: { tuition: 450 }, featured: true },
  { email: 'kamala@demo.dakshasewa.test', name: 'Kamala Dhami', ne: 'कमला धामी', phone: '9800000014', years: 10, headline: 'Festival cooking and kitchen prep', bio: 'Chopping, grinding and cooking for guests and festivals. Doteli and Nepali dishes.', langs: ['Nepali', 'Doteli'], svc: { 'kitchen-help': 380, 'house-cleaning': null }, featured: false },
];

async function user(email, full_name) {
  const { data, error } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name } });
  if (!error) return data.user.id;
  if (!/already|registered|exists/i.test(error.message)) throw error;
  for (let page = 1; page < 20; page++) {
    const { data: list } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const hit = list?.users.find((u) => u.email === email); if (hit) return hit.id; if (!list?.users.length) break;
  }
  throw new Error(`could not find existing user ${email}`);
}

const { data: cats } = await db.from('service_categories').select('id,slug');
const bySlug = Object.fromEntries((cats ?? []).map((c) => [c.slug, c.id]));
if (!Object.keys(bySlug).length) { console.error('No service categories found. Run supabase/seed.sql first.'); process.exit(1); }

await user('customer@demo.dakshasewa.test', 'Rita Chaudhary').then(async (id) => { await db.from('profiles').update({ phone: '9800000010' }).eq('id', id); });

for (const w of WORKERS) {
  const uid = await user(w.email, w.name);
  await db.from('profiles').update({ phone: w.phone }).eq('id', uid);
  const { data: row, error } = await db.from('workers').upsert({ user_id: uid, display_name: w.name, display_name_ne: w.ne, headline_en: w.headline, bio_en: w.bio, experience_years: w.years, languages: w.langs, status: 'approved', is_featured: w.featured, verified_at: new Date().toISOString(), available_days: [0, 1, 2, 3, 4, 5], work_start: '07:00', work_end: '19:00' }, { onConflict: 'user_id' }).select('id').single();
  if (error) throw error;
  await db.from('worker_private').upsert({ worker_id: row.id, phone: w.phone }, { onConflict: 'worker_id' });
  for (const [slug, rate] of Object.entries(w.svc)) if (bySlug[slug]) await db.from('worker_services').upsert({ worker_id: row.id, category_id: bySlug[slug], rate }, { onConflict: 'worker_id,category_id' });
  console.log(`✔ worker  ${w.email}`);
}
console.log(`\nDemo accounts ready. Password for all: ${PASSWORD}\n  customer@demo.dakshasewa.test\n  ${WORKERS.map((w) => w.email).join('\n  ')}\nTip: open two browsers (customer + worker) to watch live tracking.`);
