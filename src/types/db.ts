// Hand-written row shapes for what the UI reads. (Run `supabase gen types typescript` if you want full generated types.)
export type Role = 'customer' | 'worker' | 'admin';
export type BookingStatus = 'pending' | 'confirmed' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'declined';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
export type Provider = 'cash' | 'esewa' | 'khalti' | 'stripe';

export interface Profile { id: string; role: Role; status: 'active' | 'suspended'; full_name: string | null; email: string | null; phone: string | null; avatar_url: string | null; created_at: string }

export interface Category {
  id: string; parent_id: string | null; slug: string; name_en: string; name_ne: string | null; tagline_en: string | null; tagline_ne: string | null;
  description_en: string | null; description_ne: string | null; icon: string; image_url: string | null; base_price: number; price_unit: 'hour' | 'fixed';
  min_hours: number; default_hours: number; is_active: boolean; is_featured: boolean; sort_order: number;
}
export interface Worker {
  id: string; user_id: string; display_name: string; display_name_ne: string | null; avatar_url: string | null; headline_en: string | null; headline_ne: string | null;
  bio_en: string | null; bio_ne: string | null; languages: string[]; experience_years: number; rating_avg: number; rating_count: number; jobs_completed: number;
  status: 'pending' | 'approved' | 'rejected' | 'suspended'; is_listed: boolean; is_featured: boolean; available_days: number[]; work_start: string; work_end: string;
  worker_services?: { category_id: string; rate: number | null }[];
}
export interface Booking {
  id: string; code: string; customer_id: string; worker_id: string; category_id: string; status: BookingStatus; customer_name: string;
  scheduled_start: string; scheduled_end: string; duration_hours: number; address_text: string; landmark: string | null; lat: number; lng: number; notes: string | null;
  unit_price: number; price_unit: 'hour' | 'fixed'; quantity: number; subtotal: number; discount_amount: number; vat_amount: number; total_amount: number;
  commission_rate: number; commission_amount: number; worker_payout: number; currency: string; payment_provider: Provider; payment_status: PaymentStatus;
  contract_snapshot: string; contract_hash: string; signed_name: string; signed_at: string;
  accepted_at: string | null; en_route_at: string | null; arrived_at: string | null; started_at: string | null; completed_at: string | null; cancelled_at: string | null; cancel_reason: string | null;
  created_at: string;
  service_categories?: Pick<Category, 'name_en' | 'name_ne' | 'icon' | 'slug'> | null;
  workers?: Pick<Worker, 'id' | 'display_name' | 'display_name_ne' | 'avatar_url' | 'rating_avg' | 'user_id'> | null;
}
export interface LiveLocation { booking_id: string; lat: number; lng: number; heading: number | null; speed: number | null; accuracy: number | null; updated_at: string }
export interface Review { id: string; booking_id: string; reviewer_name: string | null; rating: number; comment: string | null; created_at: string }
export interface Offer { id: string; code: string; title_en: string; title_ne: string | null; description_en: string | null; description_ne: string | null; discount_type: 'percent' | 'flat'; discount_value: number; min_order: number; ends_at: string | null }
export interface Testimonial { id: string; name: string; location: string | null; quote_en: string; quote_ne: string | null; rating: number }
export interface Faq { id: string; q_en: string; q_ne: string | null; a_en: string; a_ne: string | null }
export interface ServiceArea { id: string; name_en: string; name_ne: string | null; center_lat: number; center_lng: number; radius_km: number }
export interface PageRow { slug: string; title_en: string; title_ne: string | null; body_en: string; body_ne: string | null }
export interface SavedAddress { id: string; label: string; address_text: string; landmark: string | null; lat: number; lng: number; is_default: boolean }
export interface PaymentPref { id: string; provider: Provider; label: string; account_hint: string | null; is_default: boolean }
export interface Quote { unit_price: number; price_unit: 'hour' | 'fixed'; quantity: number; subtotal: number; discount: number; vat: number; total: number; promo_ok: boolean; promo_error: string | null; promo_id: string | null }
export interface ContractTemplate { id: string; title_en: string; title_ne: string | null; body_en: string; body_ne: string | null; version: number }
