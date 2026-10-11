import { ICON_NAMES } from '@/components/Icon';

/**
 * The CMS is data-driven: each editable table is described ONCE here, and the same definition powers
 * the admin form, the list columns, server-side validation and cache invalidation. Adding a new
 * editable table = adding one entry. (Allow-listed: server actions refuse any key not in this map.)
 */
export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'color' | 'image' | 'datetime' | 'icon' | 'slug' | 'category';
export interface FieldDef {
  name: string; label: string; type: FieldType; required?: boolean; options?: { value: string; label: string }[];
  help?: string; placeholder?: string; wide?: boolean; min?: number; max?: number; step?: number; maxLength?: number; ne?: boolean; upper?: boolean; readOnlyOnEdit?: boolean;
}
export interface ColumnDef { name: string; label: string; kind?: 'text' | 'bool' | 'money' | 'date' | 'badge' | 'image' | 'mono' }
export interface ResourceDef {
  key: string; table: string; pk: string; title: string; singular: string; hint: string;
  order: { column: string; asc: boolean }; columns: ColumnDef[]; fields: FieldDef[]; tags: string[]; defaults?: Record<string, string | number | boolean>;
}

const yn = (name: string, label: string, def = true): FieldDef => ({ name, label, type: 'boolean' });
const bi = (base: string, label: string, o: Partial<FieldDef> = {}): FieldDef[] => [
  { name: `${base}_en`, label: `${label} (English)`, type: o.type ?? 'text', ...o }, { name: `${base}_ne`, label: `${label} (नेपाली)`, type: o.type ?? 'text', ne: true, ...o, required: false }];

export const RESOURCES: Record<string, ResourceDef> = {
  categories: {
    key: 'categories', table: 'service_categories', pk: 'id', title: 'Services', singular: 'service', tags: ['categories'],
    hint: 'The services customers can book. Add a new one (Plumbing, Babysitting…) and it appears on the site, in the booking flow and in worker sign-up instantly.',
    order: { column: 'sort_order', asc: true },
    columns: [{ name: 'name_en', label: 'Service' }, { name: 'base_price', label: 'Base price', kind: 'money' }, { name: 'price_unit', label: 'Unit', kind: 'badge' }, { name: 'is_featured', label: 'Featured', kind: 'bool' }, { name: 'is_active', label: 'Live', kind: 'bool' }, { name: 'sort_order', label: 'Order' }],
    defaults: { icon: 'Sparkles', price_unit: 'hour', min_hours: 1, default_hours: 2, is_active: true, sort_order: 10, base_price: 300 },
    fields: [
      { name: 'slug', label: 'URL slug', type: 'slug', required: true, readOnlyOnEdit: true, help: 'lowercase-with-dashes, used in /services/<slug>' },
      ...bi('name', 'Name', { required: true }), ...bi('tagline', 'Short tagline'), ...bi('description', 'Description', { type: 'textarea', wide: true, maxLength: 600 }),
      { name: 'icon', label: 'Icon', type: 'icon' }, { name: 'image_url', label: 'Image (optional)', type: 'image' },
      { name: 'base_price', label: 'Base price (Rs)', type: 'number', required: true, min: 0, max: 1000000, step: 10 },
      { name: 'price_unit', label: 'Price unit', type: 'select', options: [{ value: 'hour', label: 'Per hour' }, { value: 'fixed', label: 'Fixed price per visit' }] },
      { name: 'min_hours', label: 'Minimum hours', type: 'number', min: 0.5, max: 12, step: 0.5 }, { name: 'default_hours', label: 'Default hours', type: 'number', min: 0.5, max: 12, step: 0.5 },
      { name: 'parent_id', label: 'Group under (optional)', type: 'category' },
      yn('is_active', 'Live on the site'), yn('is_featured', 'Featured'), { name: 'sort_order', label: 'Sort order', type: 'number', step: 1 },
    ],
  },
  offers: {
    key: 'offers', table: 'promo_offers', pk: 'id', title: 'Offers & promo codes', singular: 'offer', tags: ['content'],
    hint: 'Coupon codes. "Show on home" lists the offer in the Offers section; hidden codes still work when typed at checkout.',
    order: { column: 'created_at', asc: false },
    columns: [{ name: 'code', label: 'Code', kind: 'mono' }, { name: 'title_en', label: 'Title' }, { name: 'discount_value', label: 'Discount' }, { name: 'discount_type', label: 'Type', kind: 'badge' }, { name: 'ends_at', label: 'Ends', kind: 'date' }, { name: 'is_active', label: 'Active', kind: 'bool' }],
    defaults: { discount_type: 'flat', per_user_limit: 1, min_order: 0, show_on_home: true, is_active: true },
    fields: [
      { name: 'code', label: 'Code', type: 'text', required: true, upper: true, maxLength: 24, help: 'A–Z, 0–9, - or _ (3–24 chars)' },
      ...bi('title', 'Title', { required: true }), ...bi('description', 'Description', { type: 'textarea', wide: true, maxLength: 300 }),
      { name: 'discount_type', label: 'Discount type', type: 'select', options: [{ value: 'flat', label: 'Flat amount (Rs)' }, { value: 'percent', label: 'Percent (%)' }] },
      { name: 'discount_value', label: 'Discount value', type: 'number', required: true, min: 1, max: 100000 }, { name: 'max_discount', label: 'Max discount (Rs, for %)', type: 'number', min: 0 },
      { name: 'min_order', label: 'Minimum order (Rs)', type: 'number', min: 0 }, { name: 'category_id', label: 'Only for service', type: 'category' },
      { name: 'starts_at', label: 'Starts (Nepal time)', type: 'datetime' }, { name: 'ends_at', label: 'Ends (Nepal time)', type: 'datetime' },
      { name: 'usage_limit', label: 'Total uses allowed', type: 'number', min: 1 }, { name: 'per_user_limit', label: 'Uses per customer', type: 'number', min: 1 },
      yn('show_on_home', 'Show on home page'), yn('is_active', 'Active'),
    ],
  },
  testimonials: {
    key: 'testimonials', table: 'testimonials', pk: 'id', title: 'Testimonials', singular: 'testimonial', tags: ['content'],
    hint: 'Real customer words only. Shown on the home page when active.', order: { column: 'sort_order', asc: true },
    columns: [{ name: 'name', label: 'Name' }, { name: 'location', label: 'Place' }, { name: 'rating', label: 'Stars' }, { name: 'is_active', label: 'Shown', kind: 'bool' }],
    defaults: { rating: 5, is_active: true, sort_order: 10 },
    fields: [{ name: 'name', label: 'Customer name', type: 'text', required: true }, { name: 'location', label: 'Place', type: 'text' }, ...bi('quote', 'Quote', { type: 'textarea', wide: true, required: true, maxLength: 400 }),
      { name: 'rating', label: 'Stars (1–5)', type: 'number', min: 1, max: 5, step: 1 }, yn('is_active', 'Show on site'), { name: 'sort_order', label: 'Sort order', type: 'number', step: 1 }],
  },
  faqs: {
    key: 'faqs', table: 'faqs', pk: 'id', title: 'FAQ', singular: 'question', tags: ['content'], hint: 'Questions shown in the FAQ section of the home page.', order: { column: 'sort_order', asc: true },
    columns: [{ name: 'q_en', label: 'Question' }, { name: 'sort_order', label: 'Order' }, { name: 'is_active', label: 'Shown', kind: 'bool' }], defaults: { is_active: true, sort_order: 10 },
    fields: [...bi('q', 'Question', { required: true }), ...bi('a', 'Answer', { type: 'textarea', wide: true, required: true, maxLength: 800 }), yn('is_active', 'Show on site'), { name: 'sort_order', label: 'Sort order', type: 'number', step: 1 }],
  },
  pages: {
    key: 'pages', table: 'pages', pk: 'slug', title: 'Pages', singular: 'page', tags: ['content'],
    hint: 'About, Terms, Privacy and any page you add (served at /p/<slug>). Formatting: "## Heading", "- list item", blank line between paragraphs.', order: { column: 'slug', asc: true },
    columns: [{ name: 'slug', label: 'URL', kind: 'mono' }, { name: 'title_en', label: 'Title' }, { name: 'is_published', label: 'Published', kind: 'bool' }], defaults: { is_published: true },
    fields: [{ name: 'slug', label: 'URL slug', type: 'slug', required: true, readOnlyOnEdit: true }, ...bi('title', 'Title', { required: true }), ...bi('body', 'Body', { type: 'textarea', wide: true, maxLength: 12000 }), yn('is_published', 'Published')],
  },
  contracts: {
    key: 'contracts', table: 'contract_templates', pk: 'id', title: 'Agreement template', singular: 'version', tags: ['content'],
    hint: 'The digital contract customers sign. Variables: {{customer_name}} {{worker_name}} {{service}} {{date}} {{time}} {{duration}} {{address}} {{landmark}} {{total}} {{payment_method}} {{booking_code}} {{platform}}. The highest ACTIVE version is used; every booking stores its own immutable, hashed copy. Have a lawyer review the text.',
    order: { column: 'version', asc: false },
    columns: [{ name: 'version', label: 'Version' }, { name: 'title_en', label: 'Title' }, { name: 'created_at', label: 'Created', kind: 'date' }, { name: 'is_active', label: 'Active', kind: 'bool' }], defaults: { is_active: true },
    fields: [...bi('title', 'Title', { required: true }), ...bi('body', 'Agreement text', { type: 'textarea', wide: true, required: true, maxLength: 12000 }), yn('is_active', 'Active')],
  },
  areas: {
    key: 'areas', table: 'service_areas', pk: 'id', title: 'Service areas', singular: 'area', tags: ['content'],
    hint: 'Customers can only drop a pin inside an active area (checked again in the database). To open a new town, add a circle: centre + radius.', order: { column: 'sort_order', asc: true },
    columns: [{ name: 'name_en', label: 'Area' }, { name: 'radius_km', label: 'Radius km' }, { name: 'is_active', label: 'Open', kind: 'bool' }], defaults: { radius_km: 8, is_active: true, sort_order: 10, center_lat: 28.6833, center_lng: 80.6 },
    fields: [...bi('name', 'Name', { required: true }), { name: 'center_lat', label: 'Centre latitude', type: 'number', required: true, min: -90, max: 90, step: 0.0001 }, { name: 'center_lng', label: 'Centre longitude', type: 'number', required: true, min: -180, max: 180, step: 0.0001 },
      { name: 'radius_km', label: 'Radius (km)', type: 'number', required: true, min: 0.5, max: 200, step: 0.5 }, yn('is_active', 'Open for bookings'), { name: 'sort_order', label: 'Sort order', type: 'number', step: 1 }],
  },
};

export const ICON_OPTIONS = ICON_NAMES.map((n) => ({ value: n, label: n }));
export const RESOURCE_LIST = Object.values(RESOURCES);
