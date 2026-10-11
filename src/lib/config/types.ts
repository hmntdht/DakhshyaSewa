export type Msg = { en: string; ne: string };

export interface Palette {
  background: string; surface: string; elevated: string; foreground: string; muted: string; line: string;
  primary: string; primary_foreground: string; accent: string; success: string; danger: string; warning: string;
}
export interface SiteConfig {
  brand: { name_en: string; name_ne: string; tagline_en: string; tagline_ne: string; city_en: string; city_ne: string; logo_url: string };
  theme: { default_mode: 'dark' | 'light'; radius: number; dark: Palette; light: Palette };
  hero: {
    eyebrow_en: string; eyebrow_ne: string; title_en: string; title_ne: string; subtitle_en: string; subtitle_ne: string;
    cta_primary_en: string; cta_primary_ne: string; cta_secondary_en: string; cta_secondary_ne: string; image_url: string;
  };
  announcement: { enabled: boolean; text_en: string; text_ne: string; link: string };
  contact: {
    phone_primary: string; phone_secondary: string; whatsapp: string; email: string; address_en: string; address_ne: string;
    hours_en: string; hours_ne: string; facebook: string; instagram: string; tiktok: string;
  };
  seo: { title: string; description: string };
  booking: {
    min_notice_hours: number; max_advance_days: number; commission_percent: number; vat_percent: number;
    tracking_window_minutes: number; pending_expiry_hours: number; free_cancel_hours: number;
  };
  payments: { enabled: { cash: boolean; esewa: boolean; khalti: boolean; stripe: boolean }; stripe_currency: string; stripe_npr_per_unit: number };
  features: { bookings_open: boolean; live_tracking: boolean; reviews: boolean };
  home_layout: { sections: { id: HomeSectionId; enabled: boolean }[] };
  copy: Record<string, Msg>;
}
export type HomeSectionId = 'services' | 'how' | 'tracking' | 'workers' | 'offers' | 'testimonials' | 'faq' | 'areas' | 'contact';
export const HOME_SECTION_IDS: HomeSectionId[] = ['services', 'how', 'tracking', 'workers', 'offers', 'testimonials', 'faq', 'areas', 'contact'];
