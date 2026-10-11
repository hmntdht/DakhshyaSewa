// Usage:  npm run make-admin -- you@example.com
// Promotes an EXISTING account (sign up on the site first) to admin. Uses the service role, so run it only on your machine / CI.
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email) { console.error('Usage: npm run make-admin -- email@example.com'); process.exit(1); }
if (!url || !key) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (put them in .env.local).'); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await db.from('profiles').update({ role: 'admin', status: 'active' }).eq('email', email).select('id,email,role');
if (error) { console.error('Failed:', error.message); process.exit(1); }
if (!data?.length) { console.error(`No account with email ${email}. Sign up on the website first, then run this again.`); process.exit(1); }
console.log(`✔ ${data[0].email} is now an admin. Sign in and open /admin`);
