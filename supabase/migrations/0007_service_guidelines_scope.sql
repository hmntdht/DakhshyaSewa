-- ──────────────────────────────────────────────────────────────────────────
-- 0007_service_guidelines_scope.sql
-- Records customer acknowledgment of the service scope menu ("What's Included & What's Not Included")
-- with policy version and timestamp on every booking.
-- ──────────────────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists scope_policy_version text default '1.0',
  add column if not exists scope_package text,
  add column if not exists scope_acknowledged_at timestamptz default now();

comment on column public.bookings.scope_policy_version is 'Version of the "What is included & not included" guideline acknowledged by the customer.';
comment on column public.bookings.scope_package is 'Selected package tier or mode (e.g. offline vs online tuition).';
comment on column public.bookings.scope_acknowledged_at is 'Timestamp when the customer acknowledged the service scope menu before booking.';
