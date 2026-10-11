-- =====================================================================
-- 0003 Row Level Security
-- Principle: deny by default. Every table has RLS on; writes to money,
-- bookings and location tables are possible ONLY through the RPCs in
-- 0002 (or the service role on the Next.js server).
-- (select auth.uid()) is wrapped so Postgres evaluates it once per query.
-- =====================================================================

alter table public.profiles           enable row level security;
alter table public.site_settings      enable row level security;
alter table public.service_areas      enable row level security;
alter table public.service_categories enable row level security;
alter table public.promo_offers       enable row level security;
alter table public.contract_templates enable row level security;
alter table public.testimonials       enable row level security;
alter table public.faqs               enable row level security;
alter table public.pages              enable row level security;
alter table public.enquiries          enable row level security;
alter table public.workers            enable row level security;
alter table public.worker_private     enable row level security;
alter table public.worker_services    enable row level security;
alter table public.saved_addresses    enable row level security;
alter table public.payment_methods    enable row level security;
alter table public.bookings           enable row level security;
alter table public.booking_secrets    enable row level security;
alter table public.promo_redemptions  enable row level security;
alter table public.payments           enable row level security;
alter table public.live_locations     enable row level security;
alter table public.tracking_pings     enable row level security;
alter table public.reviews            enable row level security;
alter table public.disputes           enable row level security;
alter table public.notifications      enable row level security;
alter table public.audit_logs         enable row level security;
alter table public.rate_limits        enable row level security;

-- ---------- profiles -------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));   -- role/status/email frozen by trigger
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- CMS (public read, admin write) --------------------------
create policy settings_read  on public.site_settings for select to anon, authenticated using (is_public or public.is_admin());
create policy settings_admin on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy areas_read  on public.service_areas for select to anon, authenticated using (is_active or public.is_admin());
create policy areas_admin on public.service_areas for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy categories_read  on public.service_categories for select to anon, authenticated using (is_active or public.is_admin());
create policy categories_admin on public.service_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy promos_read  on public.promo_offers for select to anon, authenticated
  using ((is_active and show_on_home and (ends_at is null or ends_at > now())) or public.is_admin());
create policy promos_admin on public.promo_offers for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy contracts_read  on public.contract_templates for select to anon, authenticated using (is_active or public.is_admin());
create policy contracts_admin on public.contract_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy testimonials_read  on public.testimonials for select to anon, authenticated using (is_active or public.is_admin());
create policy testimonials_admin on public.testimonials for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy faqs_read  on public.faqs for select to anon, authenticated using (is_active or public.is_admin());
create policy faqs_admin on public.faqs for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy pages_read  on public.pages for select to anon, authenticated using (is_published or public.is_admin());
create policy pages_admin on public.pages for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- enquiries: inserted by the server (service role) after rate-limit + honeypot; only admins read.
create policy enquiries_admin on public.enquiries for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- workers --------------------------------------------------
create policy workers_read on public.workers for select to anon, authenticated
  using ((status = 'approved' and is_listed) or user_id = (select auth.uid()) or public.is_admin());
create policy workers_insert_own on public.workers for insert to authenticated
  with check (user_id = (select auth.uid()));                              -- trigger forces status = 'pending'
create policy workers_update_own on public.workers for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy workers_admin on public.workers for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy wprivate_own on public.worker_private for all to authenticated
  using (exists (select 1 from public.workers w where w.id = worker_id and w.user_id = (select auth.uid())))
  with check (exists (select 1 from public.workers w where w.id = worker_id and w.user_id = (select auth.uid())));
create policy wprivate_admin on public.worker_private for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy wservices_read on public.worker_services for select to anon, authenticated
  using (exists (select 1 from public.workers w where w.id = worker_id
                 and ((w.status = 'approved' and w.is_listed) or w.user_id = (select auth.uid()))) or public.is_admin());
create policy wservices_own on public.worker_services for all to authenticated
  using (exists (select 1 from public.workers w where w.id = worker_id and w.user_id = (select auth.uid())))
  with check (exists (select 1 from public.workers w where w.id = worker_id and w.user_id = (select auth.uid())));
create policy wservices_admin on public.worker_services for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- customer extras ------------------------------------------
create policy addresses_own on public.saved_addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy pmethods_own on public.payment_methods for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- bookings & money -----------------------------------------
create policy bookings_read on public.bookings for select to authenticated
  using (customer_id = (select auth.uid()) or worker_id = (select public.my_worker_id()) or public.is_admin());
create policy bookings_admin_update on public.bookings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- no INSERT / DELETE policy: bookings are created by create_booking() only.

create policy secrets_customer on public.booking_secrets for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = (select auth.uid())) or public.is_admin());

create policy payments_read on public.payments for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id
                 and (b.customer_id = (select auth.uid()) or b.worker_id = (select public.my_worker_id()))) or public.is_admin());
create policy payments_admin_update on public.payments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy redemptions_own on public.promo_redemptions for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

create policy live_read on public.live_locations for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id
                 and (b.customer_id = (select auth.uid()) or b.worker_id = (select public.my_worker_id()))) or public.is_admin());
create policy pings_admin on public.tracking_pings for select to authenticated using (public.is_admin());

-- ---------- trust & support ------------------------------------------
create policy reviews_read on public.reviews for select to anon, authenticated
  using (is_public or customer_id = (select auth.uid()) or public.is_admin());
create policy reviews_insert on public.reviews for insert to authenticated
  with check (customer_id = (select auth.uid()));           -- trigger copies customer/worker from the completed booking
create policy reviews_admin on public.reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy disputes_read on public.disputes for select to authenticated
  using (opened_by = (select auth.uid())
         or exists (select 1 from public.bookings b where b.id = booking_id
                    and (b.customer_id = (select auth.uid()) or b.worker_id = (select public.my_worker_id())))
         or public.is_admin());
create policy disputes_insert on public.disputes for insert to authenticated
  with check (opened_by = (select auth.uid()) and status = 'open' and resolution is null and refund_amount is null and resolved_by is null
              and exists (select 1 from public.bookings b where b.id = booking_id
                          and (b.customer_id = (select auth.uid()) or b.worker_id = (select public.my_worker_id()))));
create policy disputes_admin on public.disputes for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy notifications_own_read on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy audit_admin_read   on public.audit_logs for select to authenticated using (public.is_admin());
create policy audit_admin_insert on public.audit_logs for insert to authenticated with check (public.is_admin() and actor_id = (select auth.uid()));

-- rate_limits: RLS on + zero policies = service role only.

-- ---------- belt and braces: table privileges ------------------------
revoke insert, delete on public.bookings, public.booking_secrets, public.payments,
                         public.live_locations, public.tracking_pings, public.promo_redemptions from anon, authenticated;
revoke all on public.rate_limits from anon, authenticated;
revoke all on public.enquiries from anon;
