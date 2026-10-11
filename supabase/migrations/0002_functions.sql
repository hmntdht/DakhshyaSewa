-- =====================================================================
-- 0002 functions, triggers and RPCs
-- All money maths, status transitions, PIN checks and location writes
-- happen here, inside Postgres, so a tampered browser cannot cheat.
-- Error codes are plain strings ("DS_SLOT_TAKEN") mapped to friendly
-- messages in src/lib/errors.ts.
-- =====================================================================

-- ---------- tiny helpers --------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'admin' and status = 'active');
$$;

create or replace function public.my_worker_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select id from public.workers where user_id = auth.uid();
$$;

create or replace function public.setting_json(p_key text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select value from public.site_settings where key = p_key), '{}'::jsonb);
$$;

create or replace function public.setting_num(p_key text, p_field text, p_default numeric) returns numeric
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select nullif(value ->> p_field, '')::numeric from public.site_settings where key = p_key), p_default);
$$;

create or replace function public.setting_bool(p_key text, p_field text, p_default boolean) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select nullif(value ->> p_field, '')::boolean from public.site_settings where key = p_key), p_default);
$$;

create or replace function public.haversine_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371.0088 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)));
$$;

create or replace function public.in_service_area(p_lat double precision, p_lng double precision) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.service_areas a
                 where a.is_active and public.haversine_km(a.center_lat, a.center_lng, p_lat, p_lng) <= a.radius_km);
$$;

-- updated_at triggers
create trigger trg_profiles_updated   before update on public.profiles          for each row execute function public.set_updated_at();
create trigger trg_workers_updated    before update on public.workers           for each row execute function public.set_updated_at();
create trigger trg_categories_updated before update on public.service_categories for each row execute function public.set_updated_at();
create trigger trg_bookings_updated   before update on public.bookings          for each row execute function public.set_updated_at();
create trigger trg_payments_updated   before update on public.payments          for each row execute function public.set_updated_at();
create trigger trg_disputes_updated   before update on public.disputes          for each row execute function public.set_updated_at();
create trigger trg_pages_updated      before update on public.pages             for each row execute function public.set_updated_at();
create trigger trg_settings_updated   before update on public.site_settings     for each row execute function public.set_updated_at();
create trigger trg_wprivate_updated   before update on public.worker_private    for each row execute function public.set_updated_at();

-- ---------- new auth user -> profile --------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, email, phone, full_name, avatar_url)
  values (
    new.id, new.email, nullif(new.phone, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''),
             nullif(new.raw_user_meta_data ->> 'name', ''),
             nullif(split_part(coalesce(new.email, ''), '@', 1), '')),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  ) on conflict (id) do nothing;      -- role is NEVER read from user metadata
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- column-level protection (RLS cannot do columns) ---------
create or replace function public.protect_profile_columns() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.role := old.role; new.status := old.status; new.email := old.email;
  end if;
  return new;
end $$;
create trigger trg_profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

create or replace function public.protect_worker_columns() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.rating_avg := 0; new.rating_count := 0; new.jobs_completed := 0;
      new.is_featured := false; new.commission_override := null; new.verified_at := null;
    else
      new.user_id := old.user_id; new.status := old.status; new.rating_avg := old.rating_avg;
      new.rating_count := old.rating_count; new.jobs_completed := old.jobs_completed;
      new.is_featured := old.is_featured; new.commission_override := old.commission_override;
      new.verified_at := old.verified_at;
    end if;
  end if;
  return new;
end $$;
create trigger trg_workers_protect before insert or update on public.workers
  for each row execute function public.protect_worker_columns();

-- approving a worker flips the profile role so the portal opens
create or replace function public.sync_worker_role() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'approved' then
    update public.profiles set role = 'worker' where id = new.user_id and role = 'customer';
  elsif tg_op = 'UPDATE' and old.status = 'approved' then
    update public.profiles set role = 'customer' where id = new.user_id and role = 'worker';
  end if;
  return null;
end $$;
create trigger trg_workers_role after insert or update of status on public.workers
  for each row execute function public.sync_worker_role();

-- ---------- reviews -> worker rating --------------------------------
create or replace function public.fill_review_fields() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_b public.bookings; v_name text;
begin
  select * into v_b from public.bookings where id = new.booking_id;
  if not found or v_b.status <> 'completed' then raise exception 'DS_REVIEW_NOT_ALLOWED'; end if;
  new.customer_id := v_b.customer_id;
  new.worker_id   := v_b.worker_id;
  select full_name into v_name from public.profiles where id = v_b.customer_id;
  new.reviewer_name := nullif(btrim(split_part(coalesce(v_name, ''), ' ', 1) ||
                       coalesce(' ' || nullif(left(split_part(coalesce(v_name, ''), ' ', 2), 1), '') || '.', '')), '');
  return new;
end $$;
create trigger trg_reviews_fill before insert on public.reviews
  for each row execute function public.fill_review_fields();

create or replace function public.refresh_worker_rating() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_wid uuid := coalesce(new.worker_id, old.worker_id);
begin
  update public.workers set
    rating_avg   = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where worker_id = v_wid and is_public), 0),
    rating_count = (select count(*) from public.reviews where worker_id = v_wid and is_public)
  where id = v_wid;
  return null;
end $$;
create trigger trg_reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_worker_rating();

-- ---------- pricing --------------------------------------------------
create or replace function public.compute_quote(
  p_worker_id uuid, p_category_id uuid, p_hours numeric, p_code text, p_user uuid
) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_cat public.service_categories; v_w public.workers; v_ws public.worker_services; v_promo public.promo_offers;
  v_unit numeric; v_qty numeric; v_sub numeric; v_disc numeric := 0; v_after numeric;
  v_vat numeric; v_total numeric; v_rate numeric; v_comm numeric;
  v_err text := null; v_ok boolean := false;
begin
  select * into v_cat from public.service_categories where id = p_category_id and is_active;
  if not found then raise exception 'DS_CATEGORY_UNAVAILABLE'; end if;
  select * into v_w from public.workers where id = p_worker_id;
  if not found then raise exception 'DS_WORKER_UNAVAILABLE'; end if;
  select * into v_ws from public.worker_services where worker_id = p_worker_id and category_id = p_category_id;
  if not found then raise exception 'DS_WORKER_NOT_OFFERING'; end if;

  v_unit := coalesce(v_ws.rate, v_cat.base_price);
  v_qty  := case when v_cat.price_unit = 'hour' then p_hours else 1 end;
  v_sub  := round(v_unit * v_qty, 2);

  if p_code is not null and length(btrim(p_code)) > 0 then
    select * into v_promo from public.promo_offers
     where code = upper(btrim(p_code)) and is_active
       and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now());
    if not found then v_err := 'DS_PROMO_INVALID';
    elsif v_promo.category_id is not null and v_promo.category_id <> p_category_id then v_err := 'DS_PROMO_NOT_APPLICABLE';
    elsif v_sub < v_promo.min_order then v_err := 'DS_PROMO_MIN_ORDER';
    elsif v_promo.usage_limit is not null
          and (select count(*) from public.promo_redemptions where promo_id = v_promo.id) >= v_promo.usage_limit then v_err := 'DS_PROMO_EXHAUSTED';
    elsif p_user is not null
          and (select count(*) from public.promo_redemptions where promo_id = v_promo.id and user_id = p_user) >= v_promo.per_user_limit then v_err := 'DS_PROMO_ALREADY_USED';
    else
      v_disc := case v_promo.discount_type when 'percent' then round(v_sub * v_promo.discount_value / 100, 2) else v_promo.discount_value end;
      if v_promo.max_discount is not null then v_disc := least(v_disc, v_promo.max_discount); end if;
      v_disc := least(v_disc, v_sub);
      v_ok := true;
    end if;
  end if;

  v_after := v_sub - v_disc;
  v_vat   := round(v_after * public.setting_num('booking', 'vat_percent', 0) / 100, 2);
  v_total := v_after + v_vat;
  v_rate  := coalesce(v_w.commission_override, public.setting_num('booking', 'commission_percent', 15));
  v_comm  := round(v_after * v_rate / 100, 2);

  return jsonb_build_object(
    'unit_price', v_unit, 'price_unit', v_cat.price_unit, 'quantity', v_qty, 'subtotal', v_sub,
    'discount', v_disc, 'vat', v_vat, 'total', v_total, 'currency', 'NPR',
    'commission_rate', v_rate, 'commission', v_comm, 'payout', v_after - v_comm,
    'promo_id', case when v_ok then v_promo.id else null end,
    'promo_ok', v_ok, 'promo_error', v_err);
end $$;

create or replace function public.quote_booking(p_worker_id uuid, p_category_id uuid, p_hours numeric, p_code text default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  return public.compute_quote(p_worker_id, p_category_id, p_hours, p_code, auth.uid()) - 'commission_rate' - 'commission' - 'payout';
end $$;

-- ---------- contract rendering --------------------------------------
create or replace function public.render_contract(
  p_title_en text, p_body_en text, p_title_ne text, p_body_ne text, p_vars jsonb
) returns text language plpgsql immutable as $$
declare t text; r record;
begin
  t := p_title_en || E'\n\n' || p_body_en;
  if p_body_ne is not null and length(btrim(p_body_ne)) > 0 then
    t := t || E'\n\n----------------------------------------\n\n' || coalesce(p_title_ne, p_title_en) || E'\n\n' || p_body_ne;
  end if;
  for r in select key, value from jsonb_each_text(p_vars) loop
    t := replace(t, '{{' || r.key || '}}', coalesce(r.value, ''));
  end loop;
  return t;
end $$;

-- ---------- create_booking ------------------------------------------
create or replace function public.create_booking(
  p_worker_id uuid, p_category_id uuid, p_scheduled_start timestamptz, p_duration_hours numeric,
  p_address_text text, p_landmark text, p_lat double precision, p_lng double precision,
  p_notes text, p_promo_code text, p_payment_provider public.payment_provider,
  p_signed_name text, p_accepted_terms boolean,
  p_ip text default null, p_user_agent text default null
) returns public.bookings
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles; v_w public.workers; v_cat public.service_categories;
  v_tpl public.contract_templates; v_q jsonb; v_row public.bookings;
  v_end timestamptz; v_local timestamp; v_end_local timestamp;
  v_code text; v_snapshot text; v_pin text; v_pay_label text;
begin
  if v_uid is null then raise exception 'DS_AUTH_REQUIRED'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.status <> 'active' then raise exception 'DS_ACCOUNT_SUSPENDED'; end if;
  if not public.setting_bool('features', 'bookings_open', true) then raise exception 'DS_BOOKINGS_CLOSED'; end if;
  if not coalesce(p_accepted_terms, false) or length(btrim(coalesce(p_signed_name, ''))) < 2 then
    raise exception 'DS_CONTRACT_NOT_ACCEPTED'; end if;
  if length(btrim(coalesce(p_address_text, ''))) < 3 or length(p_address_text) > 300 then raise exception 'DS_BAD_ADDRESS'; end if;
  if p_duration_hours is null or p_duration_hours <= 0 or p_duration_hours > 12 then raise exception 'DS_BAD_DURATION'; end if;

  select * into v_w from public.workers where id = p_worker_id and status = 'approved' and is_listed;
  if not found then raise exception 'DS_WORKER_UNAVAILABLE'; end if;
  if v_w.user_id = v_uid then raise exception 'DS_SELF_BOOKING'; end if;
  select * into v_cat from public.service_categories where id = p_category_id and is_active;
  if not found then raise exception 'DS_CATEGORY_UNAVAILABLE'; end if;
  if p_duration_hours < v_cat.min_hours then raise exception 'DS_BAD_DURATION'; end if;

  if not coalesce((public.setting_json('payments') -> 'enabled' ->> p_payment_provider::text)::boolean, p_payment_provider = 'cash') then
    raise exception 'DS_PAYMENT_DISABLED'; end if;

  if p_scheduled_start < now() + make_interval(mins => (public.setting_num('booking', 'min_notice_hours', 1) * 60)::int) then
    raise exception 'DS_TOO_SOON'; end if;
  if p_scheduled_start > now() + make_interval(days => public.setting_num('booking', 'max_advance_days', 45)::int) then
    raise exception 'DS_TOO_FAR'; end if;

  v_end       := p_scheduled_start + make_interval(mins => (p_duration_hours * 60)::int);
  v_local     := p_scheduled_start at time zone 'Asia/Kathmandu';
  v_end_local := v_end at time zone 'Asia/Kathmandu';
  if not (extract(dow from v_local)::smallint = any (v_w.available_days)) then raise exception 'DS_WORKER_DAY_OFF'; end if;
  if v_end_local::date <> v_local::date or v_local::time < v_w.work_start or v_end_local::time > v_w.work_end then
    raise exception 'DS_OUTSIDE_HOURS'; end if;
  if not public.in_service_area(p_lat, p_lng) then raise exception 'DS_OUT_OF_AREA'; end if;

  v_q := public.compute_quote(p_worker_id, p_category_id, p_duration_hours, p_promo_code, v_uid);
  if (v_q ->> 'promo_error') is not null then raise exception '%', v_q ->> 'promo_error'; end if;

  select * into v_tpl from public.contract_templates where kind = 'service_agreement' and is_active order by version desc limit 1;
  if not found then raise exception 'DS_NO_CONTRACT'; end if;

  v_code := 'DS-' || to_char(now() at time zone 'Asia/Kathmandu', 'YYMM') || '-' || nextval('public.booking_code_seq');
  v_pay_label := case p_payment_provider when 'cash' then 'Cash after service' when 'esewa' then 'eSewa' when 'khalti' then 'Khalti' else 'Card (Stripe)' end;
  v_snapshot := public.render_contract(v_tpl.title_en, v_tpl.body_en, v_tpl.title_ne, v_tpl.body_ne, jsonb_build_object(
    'platform', 'Daksha Sewa', 'booking_code', v_code,
    'customer_name', btrim(p_signed_name), 'worker_name', v_w.display_name, 'service', v_cat.name_en,
    'date', to_char(v_local, 'FMDay, DD Mon YYYY'), 'time', to_char(v_local, 'FMHH12:MI AM'),
    'duration', trim(trailing '.' from trim(trailing '0' from p_duration_hours::text)) || ' hour(s)',
    'address', btrim(p_address_text), 'landmark', coalesce(nullif(btrim(p_landmark), ''), '-'),
    'total', 'Rs ' || to_char((v_q ->> 'total')::numeric, 'FM999,999,990.00'), 'payment_method', v_pay_label));

  v_pin := lpad((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))::bit(24)::int % 10000)::text, 4, '0');

  begin
    insert into public.bookings (
      code, customer_id, worker_id, category_id, customer_name, scheduled_start, scheduled_end, duration_hours,
      address_text, landmark, lat, lng, notes,
      unit_price, price_unit, quantity, subtotal, discount_amount, vat_amount, total_amount,
      commission_rate, commission_amount, worker_payout, promo_id, payment_provider, payment_status,
      contract_template_id, contract_snapshot, contract_hash, signed_name, signed_ip, signed_user_agent
    ) values (
      v_code, v_uid, p_worker_id, p_category_id, coalesce(nullif(btrim(v_profile.full_name), ''), btrim(p_signed_name)),
      p_scheduled_start, v_end, p_duration_hours,
      btrim(p_address_text), nullif(btrim(p_landmark), ''), p_lat, p_lng, nullif(btrim(p_notes), ''),
      (v_q ->> 'unit_price')::numeric, v_cat.price_unit, (v_q ->> 'quantity')::numeric, (v_q ->> 'subtotal')::numeric,
      (v_q ->> 'discount')::numeric, (v_q ->> 'vat')::numeric, (v_q ->> 'total')::numeric,
      (v_q ->> 'commission_rate')::numeric, (v_q ->> 'commission')::numeric, (v_q ->> 'payout')::numeric,
      nullif(v_q ->> 'promo_id', '')::uuid, p_payment_provider,
      case when p_payment_provider = 'cash' then 'pending'::public.payment_status else 'unpaid'::public.payment_status end,
      v_tpl.id, v_snapshot, encode(sha256(convert_to(v_snapshot, 'UTF8')), 'hex'), btrim(p_signed_name),
      left(p_ip, 64), left(p_user_agent, 300)
    ) returning * into v_row;
  exception when exclusion_violation then
    raise exception 'DS_SLOT_TAKEN';
  end;

  insert into public.booking_secrets (booking_id, start_pin) values (v_row.id, v_pin);
  insert into public.payments (booking_id, provider, status, amount)
    values (v_row.id, p_payment_provider, 'pending', v_row.total_amount);
  if v_row.promo_id is not null then
    insert into public.promo_redemptions (promo_id, booking_id, user_id) values (v_row.promo_id, v_row.id, v_uid);
  end if;
  return v_row;
end $$;

-- ---------- status machine ------------------------------------------
create or replace function public.set_booking_status(
  p_booking_id uuid, p_to public.booking_status, p_reason text default null
) returns public.bookings
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); v_admin boolean := public.is_admin();
  v_b public.bookings; v_w public.workers; v_s public.booking_secrets;
  v_is_customer boolean; v_is_worker boolean;
  v_window numeric := public.setting_num('booking', 'tracking_window_minutes', 240);
begin
  if v_uid is null then raise exception 'DS_AUTH_REQUIRED'; end if;
  select * into v_b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'DS_NOT_FOUND'; end if;
  select * into v_w from public.workers where id = v_b.worker_id;
  v_is_customer := v_b.customer_id = v_uid;
  v_is_worker   := v_w.user_id = v_uid;
  if not (v_admin or v_is_customer or v_is_worker) then raise exception 'DS_FORBIDDEN'; end if;
  if v_b.status = p_to then return v_b; end if;

  if p_to = 'confirmed' then
    if v_b.status <> 'pending' or not (v_is_worker or v_admin) then raise exception 'DS_BAD_TRANSITION'; end if;
    if v_b.payment_provider <> 'cash' and v_b.payment_status <> 'paid' then raise exception 'DS_PAYMENT_REQUIRED'; end if;
    if v_w.status <> 'approved' then raise exception 'DS_WORKER_UNAVAILABLE'; end if;
    update public.bookings set status = 'confirmed', accepted_at = now() where id = p_booking_id returning * into v_b;

  elsif p_to = 'declined' then
    if v_b.status <> 'pending' or not (v_is_worker or v_admin) then raise exception 'DS_BAD_TRANSITION'; end if;
    update public.bookings set status = 'declined', cancelled_at = now(), cancelled_by = v_uid, cancel_reason = left(p_reason, 300)
      where id = p_booking_id returning * into v_b;

  elsif p_to = 'cancelled' then
    if not ( v_admin
          or (v_is_customer and v_b.status in ('pending', 'confirmed'))
          or (v_is_worker and v_b.status = 'confirmed') ) then raise exception 'DS_BAD_TRANSITION'; end if;
    if v_b.status in ('completed', 'cancelled', 'declined') then raise exception 'DS_BAD_TRANSITION'; end if;
    update public.bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid, cancel_reason = left(p_reason, 300)
      where id = p_booking_id returning * into v_b;

  elsif p_to = 'en_route' then
    if v_b.status <> 'confirmed' or not (v_is_worker or v_admin) then raise exception 'DS_BAD_TRANSITION'; end if;
    if now() < v_b.scheduled_start - make_interval(mins => v_window::int) then raise exception 'DS_TOO_EARLY'; end if;
    update public.bookings set status = 'en_route', en_route_at = now() where id = p_booking_id returning * into v_b;

  elsif p_to = 'arrived' then
    if v_b.status <> 'en_route' or not (v_is_worker or v_admin) then raise exception 'DS_BAD_TRANSITION'; end if;
    update public.bookings set status = 'arrived', arrived_at = now() where id = p_booking_id returning * into v_b;

  elsif p_to = 'in_progress' then
    if v_b.status <> 'arrived' or not (v_is_worker or v_admin) then raise exception 'DS_BAD_TRANSITION'; end if;
    select * into v_s from public.booking_secrets where booking_id = p_booking_id;
    if not v_admin and v_s.pin_verified_at is null then raise exception 'DS_PIN_REQUIRED'; end if;
    update public.bookings set status = 'in_progress', started_at = now() where id = p_booking_id returning * into v_b;

  elsif p_to = 'completed' then
    if v_b.status <> 'in_progress' or not (v_is_worker or v_admin) then raise exception 'DS_BAD_TRANSITION'; end if;
    update public.bookings set status = 'completed', completed_at = now(),
           payment_status = case when payment_provider = 'cash' then 'paid'::public.payment_status else payment_status end
      where id = p_booking_id returning * into v_b;
    update public.workers set jobs_completed = jobs_completed + 1 where id = v_b.worker_id;
    if v_b.payment_provider = 'cash' then
      update public.payments set status = 'paid', paid_at = now()
        where booking_id = p_booking_id and provider = 'cash' and status <> 'paid';
    end if;
  else
    raise exception 'DS_BAD_TRANSITION';
  end if;

  -- stop sharing the worker's position once the visit leaves the travel phase
  if p_to in ('in_progress', 'completed', 'cancelled', 'declined') then
    delete from public.live_locations where booking_id = p_booking_id;
  end if;
  if p_to in ('cancelled', 'declined') then
    delete from public.promo_redemptions where booking_id = p_booking_id;   -- release the coupon
  end if;
  return v_b;
end $$;

create or replace function public.verify_start_pin(p_booking_id uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_b public.bookings; v_s public.booking_secrets;
begin
  if v_uid is null then raise exception 'DS_AUTH_REQUIRED'; end if;
  select b.* into v_b from public.bookings b join public.workers w on w.id = b.worker_id
   where b.id = p_booking_id and w.user_id = v_uid;
  if not found then raise exception 'DS_FORBIDDEN'; end if;
  if v_b.status <> 'arrived' then raise exception 'DS_BAD_TRANSITION'; end if;
  select * into v_s from public.booking_secrets where booking_id = p_booking_id for update;
  if v_s.pin_verified_at is not null then return jsonb_build_object('ok', true); end if;
  if v_s.attempts >= 5 then return jsonb_build_object('ok', false, 'locked', true, 'attempts_left', 0); end if;
  if v_s.start_pin = btrim(coalesce(p_pin, '')) then
    update public.booking_secrets set pin_verified_at = now() where booking_id = p_booking_id;
    return jsonb_build_object('ok', true);
  end if;
  update public.booking_secrets set attempts = attempts + 1 where booking_id = p_booking_id;   -- committed: we return, not raise
  return jsonb_build_object('ok', false, 'locked', v_s.attempts + 1 >= 5, 'attempts_left', greatest(0, 4 - v_s.attempts));
end $$;

-- ---------- live location -------------------------------------------
create or replace function public.push_location(
  p_booking_id uuid, p_lat double precision, p_lng double precision,
  p_heading real default null, p_speed real default null, p_accuracy real default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_b public.bookings; v_prev public.live_locations; v_had boolean;
begin
  if v_uid is null then raise exception 'DS_AUTH_REQUIRED'; end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'DS_BAD_COORDS'; end if;
  select b.* into v_b from public.bookings b join public.workers w on w.id = b.worker_id
   where b.id = p_booking_id and w.user_id = v_uid and b.status in ('en_route', 'arrived');
  if not found then raise exception 'DS_FORBIDDEN'; end if;

  select * into v_prev from public.live_locations where booking_id = p_booking_id;
  v_had := found;
  if v_had and v_prev.updated_at > now() - interval '2 seconds' then return; end if;   -- server-side throttle

  insert into public.live_locations as l (booking_id, worker_id, lat, lng, heading, speed, accuracy, updated_at)
  values (p_booking_id, v_b.worker_id, p_lat, p_lng, p_heading, p_speed, p_accuracy, now())
  on conflict (booking_id) do update set lat = excluded.lat, lng = excluded.lng, heading = excluded.heading,
    speed = excluded.speed, accuracy = excluded.accuracy, updated_at = excluded.updated_at;

  if not v_had or v_prev.updated_at < now() - interval '10 seconds'
     or public.haversine_km(v_prev.lat, v_prev.lng, p_lat, p_lng) > 0.025 then
    insert into public.tracking_pings (booking_id, lat, lng, speed) values (p_booking_id, p_lat, p_lng, p_speed);
  end if;
end $$;

-- ---------- contacts revealed only inside an active booking ---------
create or replace function public.get_booking_contacts(p_booking_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_b public.bookings; v_w public.workers;
        v_admin boolean := public.is_admin(); v_cust boolean; v_work boolean; v_cphone text; v_wphone text;
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if not found then return null; end if;
  select * into v_w from public.workers where id = v_b.worker_id;
  v_cust := v_b.customer_id = v_uid; v_work := v_w.user_id = v_uid;
  if not (v_admin or v_cust or v_work) then return null; end if;
  if v_b.status not in ('confirmed', 'en_route', 'arrived', 'in_progress') and not v_admin then return null; end if;
  select phone into v_cphone from public.profiles where id = v_b.customer_id;
  select coalesce(wp.phone, p.phone) into v_wphone from public.profiles p
    left join public.worker_private wp on wp.worker_id = v_w.id where p.id = v_w.user_id;
  return jsonb_build_object(
    'customer_phone', case when v_work or v_admin then v_cphone end,
    'worker_phone',   case when v_cust or v_admin then v_wphone end);
end $$;

create or replace function public.worker_busy_slots(p_worker_id uuid, p_from timestamptz, p_to timestamptz)
returns table (start_at timestamptz, end_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select scheduled_start, scheduled_end from public.bookings
   where worker_id = p_worker_id and status in ('pending', 'confirmed', 'en_route', 'arrived', 'in_progress')
     and scheduled_start < p_to and scheduled_end > p_from;
$$;

-- ---------- notifications -------------------------------------------
create or replace function public.notify_booking_change() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_wu uuid; v_link_c text := '/dashboard/bookings/' || new.id; v_link_w text := '/worker/jobs/' || new.id;
begin
  select user_id into v_wu from public.workers where id = new.worker_id;
  if tg_op = 'INSERT' then
    if new.payment_provider = 'cash' then
      insert into public.notifications (user_id, title, body, link) values (v_wu, 'New booking request', new.code, v_link_w);
    end if;
    return null;
  end if;
  if new.payment_status = 'paid' and old.payment_status <> 'paid' and new.status = 'pending' and new.payment_provider <> 'cash' then
    insert into public.notifications (user_id, title, body, link) values (v_wu, 'New booking request (paid)', new.code, v_link_w);
  end if;
  if new.status is distinct from old.status then
    if new.status = 'confirmed' then
      insert into public.notifications (user_id, title, body, link) values (new.customer_id, 'Booking confirmed', new.code, v_link_c);
    elsif new.status = 'en_route' then
      insert into public.notifications (user_id, title, body, link) values (new.customer_id, 'Your worker is on the way', new.code, v_link_c);
    elsif new.status = 'arrived' then
      insert into public.notifications (user_id, title, body, link) values (new.customer_id, 'Your worker has arrived', 'Share your PIN to start', v_link_c);
    elsif new.status = 'completed' then
      insert into public.notifications (user_id, title, body, link) values (new.customer_id, 'Job completed', 'Tell us how it went', v_link_c);
    elsif new.status = 'declined' then
      insert into public.notifications (user_id, title, body, link) values (new.customer_id, 'Worker could not take this booking', new.code, v_link_c);
    elsif new.status = 'cancelled' then
      insert into public.notifications (user_id, title, body, link)
        values (case when new.cancelled_by = new.customer_id then v_wu else new.customer_id end, 'Booking cancelled', new.code,
                case when new.cancelled_by = new.customer_id then v_link_w else v_link_c end);
    end if;
  end if;
  return null;
end $$;
create trigger trg_bookings_notify after insert or update on public.bookings
  for each row execute function public.notify_booking_change();

-- ---------- housekeeping (called by cron / /api/cron/maintenance) ----
create or replace function public.expire_stale_bookings() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_n integer;
begin
  with gone as (
    update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = 'expired'
     where status = 'pending' and (
       (payment_provider <> 'cash' and payment_status <> 'paid' and created_at < now() - interval '30 minutes')
       or created_at < now() - make_interval(hours => public.setting_num('booking', 'pending_expiry_hours', 12)::int))
    returning id)
  select count(*) into v_n from gone;
  delete from public.promo_redemptions r using public.bookings b where b.id = r.booking_id and b.status in ('cancelled', 'declined');
  delete from public.tracking_pings where recorded_at < now() - interval '14 days';
  delete from public.rate_limits where window_start < now() - interval '1 day';
  delete from public.live_locations where updated_at < now() - interval '1 day';
  return v_n;
end $$;

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_hits integer;
begin
  insert into public.rate_limits as r (key, hits, window_start) values (p_key, 1, now())
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

-- ---------- realtime publication ------------------------------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.live_locations;
    alter publication supabase_realtime add table public.bookings;
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ---------- execute privileges --------------------------------------
-- Internal helpers: service role / definer functions only.
revoke all on function public.compute_quote(uuid, uuid, numeric, text, uuid) from public, anon, authenticated;
revoke all on function public.render_contract(text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.expire_stale_bookings() from public, anon, authenticated;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
-- Client-callable RPCs.
revoke all on function public.create_booking(uuid, uuid, timestamptz, numeric, text, text, double precision, double precision, text, text, public.payment_provider, text, boolean, text, text) from public, anon;
revoke all on function public.set_booking_status(uuid, public.booking_status, text) from public, anon;
revoke all on function public.verify_start_pin(uuid, text) from public, anon;
revoke all on function public.push_location(uuid, double precision, double precision, real, real, real) from public, anon;
revoke all on function public.get_booking_contacts(uuid) from public, anon;
grant execute on function public.create_booking(uuid, uuid, timestamptz, numeric, text, text, double precision, double precision, text, text, public.payment_provider, text, boolean, text, text) to authenticated;
grant execute on function public.set_booking_status(uuid, public.booking_status, text) to authenticated;
grant execute on function public.verify_start_pin(uuid, text) to authenticated;
grant execute on function public.push_location(uuid, double precision, double precision, real, real, real) to authenticated;
grant execute on function public.get_booking_contacts(uuid) to authenticated;
grant execute on function public.quote_booking(uuid, uuid, numeric, text) to anon, authenticated;
grant execute on function public.worker_busy_slots(uuid, timestamptz, timestamptz) to anon, authenticated;
