import type { Msg } from '@/lib/config/types';

/** Database RPCs raise plain codes like DS_SLOT_TAKEN. This maps them to friendly bilingual text. */
const M: Record<string, Msg> = {
  DS_AUTH_REQUIRED: { en: 'Please sign in to continue.', ne: 'कृपया जारी राख्न साइन इन गर्नुहोस्।' },
  DS_ACCOUNT_SUSPENDED: { en: 'This account is suspended. Please contact us.', ne: 'यो खाता निलम्बित छ। कृपया हामीलाई सम्पर्क गर्नुहोस्।' },
  DS_BOOKINGS_CLOSED: { en: 'Bookings are paused for the moment. Please try again soon.', ne: 'अहिले बुकिङ रोकिएको छ। केही समयपछि प्रयास गर्नुहोस्।' },
  DS_CONTRACT_NOT_ACCEPTED: { en: 'Please type your name and accept the agreement.', ne: 'कृपया आफ्नो नाम टाइप गरी सम्झौता स्वीकार गर्नुहोस्।' },
  DS_BAD_ADDRESS: { en: 'Please add a clear address for the visit.', ne: 'कृपया भेटका लागि स्पष्ट ठेगाना राख्नुहोस्।' },
  DS_BAD_DURATION: { en: 'That duration is not available for this service.', ne: 'यो सेवाका लागि यो अवधि उपलब्ध छैन।' },
  DS_WORKER_UNAVAILABLE: { en: 'This worker is not available right now.', ne: 'यो सेवाप्रदायक अहिले उपलब्ध हुनुहुन्न।' },
  DS_WORKER_NOT_OFFERING: { en: 'This worker does not offer that service.', ne: 'यो सेवाप्रदायकले त्यो सेवा दिनुहुन्न।' },
  DS_SELF_BOOKING: { en: 'You cannot book yourself.', ne: 'तपाईंले आफैँलाई बुक गर्न मिल्दैन।' },
  DS_CATEGORY_UNAVAILABLE: { en: 'This service is not available right now.', ne: 'यो सेवा अहिले उपलब्ध छैन।' },
  DS_PAYMENT_DISABLED: { en: 'That payment method is not available.', ne: 'त्यो भुक्तानी तरिका उपलब्ध छैन।' },
  DS_TOO_SOON: { en: 'Please choose a later start time.', ne: 'कृपया अलि पछिको समय रोज्नुहोस्।' },
  DS_TOO_FAR: { en: 'That date is too far ahead.', ne: 'त्यो मिति धेरै टाढा छ।' },
  DS_WORKER_DAY_OFF: { en: 'The worker is off on that day.', ne: 'त्यो दिन सेवाप्रदायक उपलब्ध हुनुहुन्न।' },
  DS_OUTSIDE_HOURS: { en: 'That time is outside the worker’s working hours.', ne: 'त्यो समय सेवाप्रदायकको कार्य समयभन्दा बाहिर छ।' },
  DS_OUT_OF_AREA: { en: 'That pin is outside the areas we serve.', ne: 'त्यो स्थान हामीले सेवा दिने क्षेत्रभन्दा बाहिर छ।' },
  DS_SLOT_TAKEN: { en: 'That time was just taken. Please pick another slot.', ne: 'त्यो समय भर्खरै लिइयो। अर्को समय रोज्नुहोस्।' },
  DS_NO_CONTRACT: { en: 'The agreement is not set up yet. Please contact us.', ne: 'सम्झौता अझै तयार छैन। कृपया हामीलाई सम्पर्क गर्नुहोस्।' },
  DS_PROMO_INVALID: { en: 'That code is not valid.', ne: 'त्यो कोड मान्य छैन।' },
  DS_PROMO_NOT_APPLICABLE: { en: 'That code does not apply to this service.', ne: 'त्यो कोड यो सेवामा लागू हुँदैन।' },
  DS_PROMO_MIN_ORDER: { en: 'This order is below the minimum for that code.', ne: 'यो अर्डर त्यो कोडको न्यूनतम रकमभन्दा कम छ।' },
  DS_PROMO_EXHAUSTED: { en: 'That code has been fully used.', ne: 'त्यो कोडको सीमा सकिएको छ।' },
  DS_PROMO_ALREADY_USED: { en: 'You have already used that code.', ne: 'तपाईंले त्यो कोड पहिले नै प्रयोग गर्नुभएको छ।' },
  DS_NOT_FOUND: { en: 'We could not find that booking.', ne: 'त्यो बुकिङ फेला परेन।' },
  DS_FORBIDDEN: { en: 'You do not have access to that.', ne: 'तपाईंलाई त्यसमा पहुँच छैन।' },
  DS_BAD_TRANSITION: { en: 'That step is not available right now.', ne: 'यो चरण अहिले उपलब्ध छैन।' },
  DS_PAYMENT_REQUIRED: { en: 'This booking is waiting for payment.', ne: 'यो बुकिङ भुक्तानीको प्रतीक्षामा छ।' },
  DS_TOO_EARLY: { en: 'Too early to start travelling for this booking.', ne: 'यो बुकिङका लागि यात्रा सुरु गर्न अझै चाँडो छ।' },
  DS_PIN_REQUIRED: { en: 'Enter the customer’s start PIN first.', ne: 'पहिले ग्राहकको सुरु PIN हाल्नुहोस्।' },
  DS_BAD_COORDS: { en: 'Location looks invalid.', ne: 'स्थान मिलेन।' },
  DS_REVIEW_NOT_ALLOWED: { en: 'You can review a booking once it is completed.', ne: 'बुकिङ सकिएपछि मात्र समीक्षा गर्न सकिन्छ।' },
};

export const GENERIC_ERROR: Msg = { en: 'Something went wrong. Please try again.', ne: 'केही गडबड भयो। कृपया फेरि प्रयास गर्नुहोस्।' };
export const RATE_LIMITED: Msg = { en: 'Too many attempts. Please wait a minute and try again.', ne: 'धेरै प्रयास भयो। एक मिनेट पर्खेर फेरि प्रयास गर्नुहोस्।' };

export function toMsg(err: unknown): Msg {
  const text = typeof err === 'string' ? err : (err as { message?: string } | null)?.message ?? '';
  const code = /DS_[A-Z_]+/.exec(text)?.[0];
  if (code && M[code]) return M[code];
  if (/duplicate key|unique/i.test(text)) return { en: 'That already exists.', ne: 'त्यो पहिले नै छ।' };
  if (/row-level security|permission denied/i.test(text)) return M.DS_FORBIDDEN;
  if (text && process.env.NODE_ENV !== 'production') console.error('[error]', text);
  return GENERIC_ERROR;
}

export type ActionResult<T = undefined> = { ok: true; message?: Msg; data?: T } | { ok: false; error: Msg };
export const fail = (err: unknown): { ok: false; error: Msg } => ({ ok: false, error: toMsg(err) });
export const done = <T = undefined,>(message?: Msg, data?: T): ActionResult<T> => ({ ok: true, message, data });
