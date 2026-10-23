'use server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';
import { done, fail, RATE_LIMITED, type ActionResult } from '@/lib/errors';
import { sendAdminEnquiryEmail, sendUserEnquiryThankYouEmail } from '@/lib/email';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/),
  email: z.string().trim().email().optional().or(z.literal('')),
  service: z.string().trim().max(80).optional(),
  message: z.string().trim().max(1000).optional(),
  website: z.string().max(0).optional(), // honeypot: humans leave it empty
});

export async function submitEnquiry(fd: FormData): Promise<ActionResult> {
  const p = schema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: { en: 'Please check your name, phone number, and email address.', ne: 'कृपया नाम, फोन नम्बर र इमेल जाँच्नुहोस्।' } };
  if (p.data.website) return done(); // a bot filled the hidden field: pretend it worked
  if (!(await rateLimit(`enquiry:${await clientIp()}`, 5, 3600))) return { ok: false, error: RATE_LIMITED };

  const userEmail = p.data.email && p.data.email.length > 0 ? p.data.email : undefined;
  const storedMessage = userEmail
    ? `${p.data.message || ''}\n\n[Email: ${userEmail}]`.trim()
    : (p.data.message || null);

  try {
    const { error } = await createAdminClient().from('enquiries').insert({
      name: p.data.name,
      phone: p.data.phone,
      service: p.data.service || null,
      message: storedMessage,
    });
    if (error) throw error;
  } catch (e) {
    return fail(e);
  }

  // Asynchronously dispatch emails without blocking user response
  Promise.allSettled([
    // 1. Notify ADMIN_NOTIFY_EMAIL with message, name, and details
    sendAdminEnquiryEmail({
      name: p.data.name,
      phone: p.data.phone,
      email: userEmail,
      service: p.data.service || undefined,
      message: p.data.message || undefined,
    }).catch((err) => console.error('[email] Error sending admin enquiry notification:', err)),

    // 2. If user provided an email, send them a thank you confirmation
    userEmail
      ? sendUserEnquiryThankYouEmail({
          to: userEmail,
          name: p.data.name,
          service: p.data.service || undefined,
          message: p.data.message || undefined,
        }).catch((err) => console.error('[email] Error sending user thank you message:', err))
      : Promise.resolve(),
  ]);

  return done({
    en: 'Thank you! Your message has been sent. We will get in touch with you shortly.',
    ne: 'धन्यवाद! तपाईंको सन्देश पठाइयो। हामी छिट्टै सम्पर्क गर्नेछौं।',
  });
}
