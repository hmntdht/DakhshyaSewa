'use server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';
import { done, fail, RATE_LIMITED, type ActionResult } from '@/lib/errors';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/),
  service: z.string().trim().max(80).optional(),
  message: z.string().trim().max(1000).optional(),
  website: z.string().max(0).optional(), // honeypot: humans leave it empty
});

export async function submitEnquiry(fd: FormData): Promise<ActionResult> {
  const p = schema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: { en: 'Please check your name and phone number.', ne: 'कृपया नाम र फोन नम्बर जाँच्नुहोस्।' } };
  if (p.data.website) return done();                       // a bot filled the hidden field: pretend it worked
  if (!(await rateLimit(`enquiry:${await clientIp()}`, 5, 3600))) return { ok: false, error: RATE_LIMITED };
  try {
    const { error } = await createAdminClient().from('enquiries').insert({ name: p.data.name, phone: p.data.phone, service: p.data.service || null, message: p.data.message || null });
    if (error) throw error;
  } catch (e) { return fail(e); }
  return done({ en: 'Thank you. We will call you soon.', ne: 'धन्यवाद। हामी छिट्टै फोन गर्नेछौं।' });
}
