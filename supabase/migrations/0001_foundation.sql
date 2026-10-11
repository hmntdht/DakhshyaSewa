-- =====================================================================
-- Daksha Sewa (दक्ष सेवा) :: 0001 foundation
-- Extensions, enums and every table. Functions, RLS and storage follow
-- in 0002 - 0005. Run the files in order (supabase db push does this).
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists btree_gist;   -- exclusion constraint: no double-booked workers
create extension if not exists pg_trgm;      -- fuzzy worker / service search

-- ---------- enums ----------------------------------------------------
create type public.user_role        as enum ('customer', 'worker', 'admin');
create type public.account_status   as enum ('active', 'suspended');
create type public.worker_status    as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.booking_status   as enum ('pending', 'confirmed', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled', 'declined');
create type public.payment_status   as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded');
create type public.payment_provider as enum ('cash', 'esewa', 'khalti', 'stripe');
create type public.price_unit       as enum ('hour', 'fixed');
create type public.dispute_status   as enum ('open', 'under_review', 'resolved', 'rejected');
create type public.discount_type    as enum ('percent', 'flat');

-- ---------- identity -------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role      not null default 'customer',
  status      public.account_status not null default 'active',
  full_name   text,
  email       text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

-- ---------- CMS / configuration -------------------------------------
-- One row per config group (brand, theme, hero, contact, booking, payments ...)
create table public.site_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  is_public   boolean not null default true,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table public.service_areas (
  id          uuid primary key default gen_random_uuid(),
  name_en     text not null,
  name_ne     text,
  center_lat  double precision not null check (center_lat between -90 and 90),
  center_lng  double precision not null check (center_lng between -180 and 180),
  radius_km   numeric(6,2) not null check (radius_km > 0 and radius_km <= 200),
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- "Subdomains" of the household domain. parent_id allows grouping (e.g. Home Care > Cleaning).
create table public.service_categories (
  id             uuid primary key default gen_random_uuid(),
  parent_id      uuid references public.service_categories (id) on delete set null,
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_en        text not null,
  name_ne        text,
  tagline_en     text,
  tagline_ne     text,
  description_en text,
  description_ne text,
  icon           text not null default 'Sparkles',
  image_url      text,
  base_price     numeric(10,2) not null check (base_price >= 0),
  price_unit     public.price_unit not null default 'hour',
  min_hours      numeric(3,1) not null default 1 check (min_hours > 0 and min_hours <= 12),
  default_hours  numeric(3,1) not null default 2 check (default_hours > 0 and default_hours <= 12),
  is_active      boolean not null default true,
  is_featured    boolean not null default false,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index service_categories_active_idx on public.service_categories (is_active, sort_order);

create table public.promo_offers (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,24}$'),
  title_en       text not null,
  title_ne       text,
  description_en text,
  description_ne text,
  discount_type  public.discount_type not null default 'flat',
  discount_value numeric(10,2) not null check (discount_value > 0),
  max_discount   numeric(10,2),
  min_order      numeric(10,2) not null default 0,
  category_id    uuid references public.service_categories (id) on delete cascade,
  starts_at      timestamptz,
  ends_at        timestamptz,
  usage_limit    integer check (usage_limit > 0),
  per_user_limit integer not null default 1 check (per_user_limit > 0),
  show_on_home   boolean not null default true,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create table public.contract_templates (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'service_agreement',
  version    integer not null default 1,
  title_en   text not null,
  title_ne   text,
  body_en    text not null,
  body_ne    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (kind, version)
);

create table public.testimonials (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  location   text,
  quote_en   text not null,
  quote_ne   text,
  rating     smallint not null default 5 check (rating between 1 and 5),
  avatar_url text,
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.faqs (
  id         uuid primary key default gen_random_uuid(),
  q_en       text not null,
  q_ne       text,
  a_en       text not null,
  a_ne       text,
  is_active  boolean not null default true,
  sort_order integer not null default 0
);

create table public.pages (
  slug         text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_en     text not null,
  title_ne     text,
  body_en      text not null default '',
  body_ne      text,
  is_published boolean not null default true,
  updated_at   timestamptz not null default now()
);

create table public.enquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(name) between 2 and 80),
  phone      text not null check (length(phone) between 7 and 20),
  service    text,
  message    text check (length(message) <= 1000),
  status     text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

-- ---------- workers --------------------------------------------------
create table public.workers (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references public.profiles (id) on delete cascade,
  display_name        text not null check (length(display_name) between 2 and 60),
  display_name_ne     text,
  avatar_url          text,
  headline_en         text check (length(headline_en) <= 120),
  headline_ne         text,
  bio_en              text check (length(bio_en) <= 1200),
  bio_ne              text,
  languages           text[] not null default '{Nepali}',
  experience_years    smallint not null default 0 check (experience_years between 0 and 60),
  rating_avg          numeric(3,2) not null default 0,
  rating_count        integer not null default 0,
  jobs_completed      integer not null default 0,
  status              public.worker_status not null default 'pending',
  is_listed           boolean not null default true,
  is_featured         boolean not null default false,
  commission_override numeric(5,2) check (commission_override between 0 and 100),
  available_days      smallint[] not null default '{0,1,2,3,4,5,6}',   -- 0 = Sunday
  work_start          time not null default '07:00',
  work_end            time not null default '19:00',
  verified_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (work_end > work_start)
);
create index workers_listing_idx on public.workers (status, is_listed, rating_avg desc);
create index workers_name_trgm on public.workers using gin (display_name gin_trgm_ops);

-- Sensitive worker data. Never exposed to customers.
create table public.worker_private (
  worker_id       uuid primary key references public.workers (id) on delete cascade,
  phone           text,
  whatsapp        text,
  citizenship_no  text,
  id_doc_path     text,
  selfie_path     text,
  address         text,
  payout_method   text,
  payout_account  text,
  admin_notes     text,
  updated_at      timestamptz not null default now()
);

create table public.worker_services (
  worker_id   uuid not null references public.workers (id) on delete cascade,
  category_id uuid not null references public.service_categories (id) on delete cascade,
  rate        numeric(10,2) check (rate >= 0),     -- null = category base price
  primary key (worker_id, category_id)
);
create index worker_services_category_idx on public.worker_services (category_id);

-- ---------- customer extras -----------------------------------------
create table public.saved_addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  label        text not null check (length(label) between 1 and 40),
  address_text text not null check (length(address_text) between 3 and 300),
  landmark     text check (length(landmark) <= 200),
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index saved_addresses_user_idx on public.saved_addresses (user_id);

-- Preferences only. Card numbers / wallet credentials are NEVER stored here.
create table public.payment_methods (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  provider     public.payment_provider not null,
  label        text not null check (length(label) between 1 and 40),
  account_hint text check (length(account_hint) <= 20),   -- e.g. "98•••••880"
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index payment_methods_user_idx on public.payment_methods (user_id);

-- ---------- bookings -------------------------------------------------
create sequence public.booking_code_seq start 1001;

create table public.bookings (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique,
  customer_id          uuid not null references public.profiles (id) on delete restrict,
  worker_id            uuid not null references public.workers (id) on delete restrict,
  category_id          uuid not null references public.service_categories (id) on delete restrict,
  status               public.booking_status not null default 'pending',
  customer_name        text not null,
  scheduled_start      timestamptz not null,
  scheduled_end        timestamptz not null,
  duration_hours       numeric(4,1) not null check (duration_hours > 0 and duration_hours <= 12),
  address_text         text not null,
  landmark             text,
  lat                  double precision not null check (lat between -90 and 90),
  lng                  double precision not null check (lng between -180 and 180),
  notes                text check (length(notes) <= 600),
  -- pricing (computed in SQL, never trusted from the client)
  unit_price           numeric(10,2) not null,
  price_unit           public.price_unit not null,
  quantity             numeric(6,2) not null,
  subtotal             numeric(10,2) not null,
  discount_amount      numeric(10,2) not null default 0,
  vat_amount           numeric(10,2) not null default 0,
  total_amount         numeric(10,2) not null,
  commission_rate      numeric(5,2) not null,
  commission_amount    numeric(10,2) not null,
  worker_payout        numeric(10,2) not null,
  currency             text not null default 'NPR',
  promo_id             uuid references public.promo_offers (id) on delete set null,
  payment_provider     public.payment_provider not null default 'cash',
  payment_status       public.payment_status not null default 'unpaid',
  -- digital contract (immutable snapshot + hash of what the customer agreed to)
  contract_template_id uuid references public.contract_templates (id) on delete set null,
  contract_snapshot    text not null,
  contract_hash        text not null,
  signed_name          text not null,
  signed_at            timestamptz not null default now(),
  signed_ip            text,
  signed_user_agent    text,
  -- lifecycle
  accepted_at          timestamptz,
  en_route_at          timestamptz,
  arrived_at           timestamptz,
  started_at           timestamptz,
  completed_at         timestamptz,
  cancelled_at         timestamptz,
  cancelled_by         uuid references public.profiles (id) on delete set null,
  cancel_reason        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (scheduled_end > scheduled_start),
  -- A worker can never hold two live bookings that overlap in time.
  constraint bookings_no_overlap exclude using gist (
    worker_id with =,
    tstzrange(scheduled_start, scheduled_end, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'en_route', 'arrived', 'in_progress'))
);
create index bookings_customer_idx on public.bookings (customer_id, scheduled_start desc);
create index bookings_worker_idx   on public.bookings (worker_id, scheduled_start desc);
create index bookings_status_idx   on public.bookings (status, created_at desc);
create index bookings_created_idx  on public.bookings (created_at desc);

-- The start PIN lives apart from bookings so the worker's RLS can never read it.
create table public.booking_secrets (
  booking_id       uuid primary key references public.bookings (id) on delete cascade,
  start_pin        text not null check (start_pin ~ '^[0-9]{4}$'),
  attempts         smallint not null default 0,
  pin_verified_at  timestamptz
);

create table public.promo_redemptions (
  id         uuid primary key default gen_random_uuid(),
  promo_id   uuid not null references public.promo_offers (id) on delete cascade,
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index promo_redemptions_promo_idx on public.promo_redemptions (promo_id, user_id);

create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.bookings (id) on delete cascade,
  provider         public.payment_provider not null,
  status           public.payment_status not null default 'pending',
  amount           numeric(10,2) not null check (amount >= 0),
  currency         text not null default 'NPR',
  provider_ref     text,
  provider_payload jsonb,
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index payments_booking_idx on public.payments (booking_id);
create unique index payments_one_paid_per_booking on public.payments (booking_id) where status = 'paid';
create unique index payments_provider_ref_uidx on public.payments (provider, provider_ref) where provider_ref is not null;

-- ---------- live tracking -------------------------------------------
-- Latest position only (one row per active booking) -> cheap Realtime fan-out.
create table public.live_locations (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  worker_id  uuid not null references public.workers (id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  heading    real,
  speed      real,
  accuracy   real,
  updated_at timestamptz not null default now()
);

-- Append-only breadcrumb trail for disputes / route replay. Purged after 14 days.
create table public.tracking_pings (
  id          bigint generated always as identity primary key,
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  lat         double precision not null,
  lng         double precision not null,
  speed       real,
  recorded_at timestamptz not null default now()
);
create index tracking_pings_booking_idx on public.tracking_pings (booking_id, recorded_at);
create index tracking_pings_time_idx on public.tracking_pings (recorded_at);

-- ---------- trust & support -----------------------------------------
create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null unique references public.bookings (id) on delete cascade,
  customer_id   uuid not null references public.profiles (id) on delete cascade,
  worker_id     uuid not null references public.workers (id) on delete cascade,
  reviewer_name text,
  rating        smallint not null check (rating between 1 and 5),
  comment       text check (length(comment) <= 800),
  is_public     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index reviews_worker_idx on public.reviews (worker_id, created_at desc);

create table public.disputes (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings (id) on delete cascade,
  opened_by     uuid not null references public.profiles (id) on delete cascade,
  reason        text not null check (length(reason) between 3 and 120),
  details       text check (length(details) <= 2000),
  status        public.dispute_status not null default 'open',
  resolution    text,
  refund_amount numeric(10,2),
  resolved_by   uuid references public.profiles (id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index disputes_status_idx on public.disputes (status, created_at desc);

create table public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  text,
  details    jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_time_idx on public.audit_logs (created_at desc);

-- Fixed-window counters used by the Next.js API layer (service role only).
create table public.rate_limits (
  key          text primary key,
  hits         integer not null default 0,
  window_start timestamptz not null default now()
);
