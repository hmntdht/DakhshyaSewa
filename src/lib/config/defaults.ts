import type { SiteConfig } from './types';

/** Used only when the database is unreachable / not configured yet. The seed.sql rows are the source of truth. */
export const DEFAULT_CONFIG: SiteConfig = {
  brand: { name_en: 'Daksha Sewa', name_ne: 'दक्ष सेवा', tagline_en: 'Skilled hands for your home', tagline_ne: 'तपाईंको घरमा दक्ष हात', city_en: 'Dhangadhi, Kailali', city_ne: 'धनगढी, कैलाली', logo_url: '' },
  theme: {
    default_mode: 'dark', radius: 14,
    dark: { background: '#111216', surface: '#17181D', elevated: '#1F2128', foreground: '#FEEED5', muted: '#A8A196', line: '#2B2D35', primary: '#FABA8D', primary_foreground: '#1A1209', accent: '#D9B779', success: '#7BD3A0', danger: '#F2766B', warning: '#F5C26B' },
    light: { background: '#FBF5EA', surface: '#FFFFFF', elevated: '#F4ECDD', foreground: '#17181C', muted: '#6B655B', line: '#E6DCCB', primary: '#BF561B', primary_foreground: '#FFFFFF', accent: '#9A7A33', success: '#1F8F55', danger: '#C8402F', warning: '#B57A12' },
  },
  hero: {
    eyebrow_en: 'Now booking in Dhangadhi', eyebrow_ne: 'धनगढीमा बुकिङ सुरु',
    title_en: 'Skilled hands for your home.', title_ne: 'तपाईंको घरमा दक्ष हात।',
    subtitle_en: 'Cleaning, kitchen help, birthday set-ups and tuition from verified people in Dhangadhi. Pin your door on the map, then watch them arrive.',
    subtitle_ne: 'धनगढीका प्रमाणित सहयोगीबाट घर सफाइ, भान्सा सहयोग, जन्मदिन सजावट र ट्युसन। नक्सामा आफ्नो ठेगाना राख्नुहोस्, उहाँ आउँदै गरेको हेर्नुहोस्।',
    cta_primary_en: 'Book a service', cta_primary_ne: 'सेवा बुक गर्नुहोस्', cta_secondary_en: 'How it works', cta_secondary_ne: 'कसरी काम गर्छ', image_url: '',
  },
  announcement: { enabled: true, text_en: 'Launching soon in Dhangadhi. First booking gets Rs 200 off with code DAKSHA200.', text_ne: 'धनगढीमा छिट्टै सुरु हुँदैछ। पहिलो बुकिङमा DAKSHA200 कोडले रु २०० छुट।', link: '/services' },
  contact: { phone_primary: '9800670880', phone_secondary: '9800670660', whatsapp: '9779800670880', email: '', address_en: 'Dhangadhi, Kailali, Sudurpaschim Province', address_ne: 'धनगढी, कैलाली, सुदूरपश्चिम प्रदेश', hours_en: 'Every day, 7 am to 7 pm', hours_ne: 'हरेक दिन, बिहान ७ देखि साँझ ७ बजेसम्म', facebook: '', instagram: '', tiktok: '' },
  seo: { title: 'Daksha Sewa (दक्ष सेवा) | Home services in Dhangadhi', description: 'Book verified cleaners, cooking helpers, birthday decorators and tutors in Dhangadhi, Kailali. Fair prices, a signed agreement, and live arrival tracking.' },
  booking: { min_notice_hours: 1, max_advance_days: 45, commission_percent: 15, vat_percent: 0, tracking_window_minutes: 240, pending_expiry_hours: 12, free_cancel_hours: 2 },
  payments: { enabled: { cash: true, esewa: true, khalti: true, stripe: false }, stripe_currency: 'usd', stripe_npr_per_unit: 133 },
  features: { bookings_open: true, live_tracking: true, reviews: true },
  home_layout: { sections: ['services', 'how', 'tracking', 'workers', 'offers', 'testimonials', 'faq', 'areas', 'contact'].map((id) => ({ id: id as never, enabled: true })) },
  copy: {},
};

export const FALLBACK_CATEGORIES = [
  { id: 'fallback-1', slug: 'house-cleaning', name_en: 'House Cleaning', name_ne: 'घर सफाइ', tagline_en: 'Floors, kitchens, bathrooms. Done properly.', tagline_ne: 'भुइँ, भान्सा, बाथरुम। राम्ररी सफा।', icon: 'Sparkles', base_price: 300, price_unit: 'hour', min_hours: 2, default_hours: 3 },
  { id: 'fallback-2', slug: 'kitchen-help', name_en: 'Kitchen Prep & Cooking Help', name_ne: 'भान्सा तयारी र खाना पकाउन सहयोग', tagline_en: 'Chopping, grinding, cooking, clearing up.', tagline_ne: 'काट्ने, पिस्ने, पकाउने, सफा गर्ने।', icon: 'ChefHat', base_price: 350, price_unit: 'hour', min_hours: 2, default_hours: 3 },
  { id: 'fallback-3', slug: 'birthday-decoration', name_en: 'Birthday Decoration', name_ne: 'जन्मदिन सजावट', tagline_en: 'Balloons, backdrops and a tidy-up after.', tagline_ne: 'बेलुन, ब्याकड्रप र सकिएपछि सफाइ।', icon: 'PartyPopper', base_price: 3500, price_unit: 'fixed', min_hours: 2, default_hours: 3 },
  { id: 'fallback-4', slug: 'tuition', name_en: 'Tuition (Online / Offline)', name_ne: 'ट्युसन (अनलाइन / अफलाइन)', tagline_en: 'At your table or on a video call.', tagline_ne: 'घरमै वा भिडियो कलमा।', icon: 'GraduationCap', base_price: 400, price_unit: 'hour', min_hours: 1, default_hours: 1 },
];
