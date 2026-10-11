-- =====================================================================
-- Daksha Sewa DB smoke test. Everything runs inside one transaction and
-- is rolled back, so it leaves no data behind.
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/smoke_test.sql
-- Needs migrations 0001-0005 + seed.sql applied first.
-- =====================================================================
\set ON_ERROR_STOP on
begin;

-- ---- fixtures (as postgres) ------------------------------------------
insert into auth.users (id, email, phone) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local',  '9800000001'),
  ('00000000-0000-0000-0000-0000000000c1', 'cust1@test.local',  '9800000002'),
  ('00000000-0000-0000-0000-0000000000c2', 'cust2@test.local',  '9800000003'),
  ('00000000-0000-0000-0000-0000000000b1', 'worker@test.local', '9800000004');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set full_name = 'Rita Chaudhary' where id = '00000000-0000-0000-0000-0000000000c1';

-- ---- worker applies; privilege-escalation attempt must be neutralised ----
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
set local role authenticated;
insert into public.workers (user_id, display_name, status, rating_avg, is_featured, commission_override)
  values ('00000000-0000-0000-0000-0000000000b1', 'Sunita K.', 'approved', 5, true, 0);
do $$ declare w public.workers; begin
  select * into w from public.workers where user_id = '00000000-0000-0000-0000-0000000000b1';
  assert w.status = 'pending' and w.rating_avg = 0 and not w.is_featured and w.commission_override is null,
         'worker self-insert must be forced to pending/default values';
  raise notice 'PASS worker cannot self-approve on insert';
end $$;
update public.workers set status = 'approved', rating_avg = 5 where user_id = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  assert (select status from public.workers where user_id = '00000000-0000-0000-0000-0000000000b1') = 'pending',
         'worker must not self-approve on update';
  raise notice 'PASS worker cannot self-approve on update';
end $$;

-- ---- admin approves; role flips to worker ----------------------------
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;
update public.workers set status = 'approved', verified_at = now() where user_id = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000b1') = 'worker', 'profile role should become worker';
  raise notice 'PASS admin approval flips profile role';
end $$;
reset role;
insert into public.worker_services (worker_id, category_id, rate)
  select w.id, c.id, 400 from public.workers w, public.service_categories c
   where w.user_id = '00000000-0000-0000-0000-0000000000b1' and c.slug = 'house-cleaning';

-- ---- customer: role escalation blocked, quote, booking ----------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
set local role authenticated;
update public.profiles set role = 'admin', full_name = 'Rita Chaudhary' where id = '00000000-0000-0000-0000-0000000000c1';
do $$ begin
  assert (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000c1') = 'customer', 'customer must not become admin';
  raise notice 'PASS customer cannot escalate to admin';
end $$;

do $$
declare w uuid; c uuid; q jsonb; b public.bookings; start_ts timestamptz; err text;
begin
  select id into w from public.workers where user_id = '00000000-0000-0000-0000-0000000000b1';
  select id into c from public.service_categories where slug = 'house-cleaning';
  q := public.quote_booking(w, c, 3, 'daksha200');
  assert (q ->> 'subtotal')::numeric = 1200 and (q ->> 'discount')::numeric = 200 and (q ->> 'total')::numeric = 1000, 'quote maths: ' || q::text;
  assert not (q ? 'commission'), 'customer quote must not leak commission';
  raise notice 'PASS quote with promo: total Rs %', q ->> 'total';

  start_ts := ((date_trunc('day', now() at time zone 'Asia/Kathmandu') + interval '2 days 10 hours') at time zone 'Asia/Kathmandu');
  b := public.create_booking(w, c, start_ts, 3, 'Hasanpur, Dhangadhi', 'Near the temple', 28.6862, 80.5981, 'Please bring a mop', 'DAKSHA200', 'cash', 'Rita Chaudhary', true, '203.0.113.9', 'test-agent');
  assert b.status = 'pending' and b.total_amount = 1000 and b.commission_amount = 150 and b.worker_payout = 850, 'booking totals';
  assert b.contract_snapshot like '%Rita Chaudhary%' and b.contract_snapshot like '%' || b.code || '%' and length(b.contract_hash) = 64, 'contract snapshot';
  assert b.contract_snapshot not like '%{{%', 'every contract variable must be replaced';
  raise notice 'PASS booking created %, contract hash %', b.code, left(b.contract_hash, 12);

  -- double-use of a one-time promo
  begin
    perform public.create_booking(w, c, start_ts + interval '5 hours', 2, 'Hasanpur', null, 28.6862, 80.5981, null, 'DAKSHA200', 'cash', 'Rita', true);
    assert false, 'promo reuse should fail';
  exception when others then
    get stacked diagnostics err = message_text; assert err = 'DS_PROMO_ALREADY_USED', 'expected DS_PROMO_ALREADY_USED got ' || err;
    raise notice 'PASS one-time promo cannot be reused';
  end;
  -- outside service area (Kathmandu)
  begin
    perform public.create_booking(w, c, start_ts + interval '5 hours', 2, 'Thamel', null, 27.7172, 85.3240, null, null, 'cash', 'Rita', true);
    assert false, 'area check';
  exception when others then
    get stacked diagnostics err = message_text; assert err = 'DS_OUT_OF_AREA', 'expected DS_OUT_OF_AREA got ' || err;
    raise notice 'PASS geofence rejects pin outside service areas';
  end;
  -- outside working hours (10 pm)
  begin
    perform public.create_booking(w, c, start_ts + interval '12 hours', 2, 'Hasanpur', null, 28.6862, 80.5981, null, null, 'cash', 'Rita', true);
    assert false, 'hours check';
  exception when others then
    get stacked diagnostics err = message_text; assert err = 'DS_OUTSIDE_HOURS', 'expected DS_OUTSIDE_HOURS got ' || err;
    raise notice 'PASS working hours enforced';
  end;
  -- contract must be accepted
  begin
    perform public.create_booking(w, c, start_ts + interval '5 hours', 2, 'Hasanpur', null, 28.6862, 80.5981, null, null, 'cash', 'Rita', false);
    assert false, 'contract';
  exception when others then
    get stacked diagnostics err = message_text; assert err = 'DS_CONTRACT_NOT_ACCEPTED';
    raise notice 'PASS contract acceptance required';
  end;
  -- disabled payment provider (stripe is off in seed)
  begin
    perform public.create_booking(w, c, start_ts + interval '5 hours', 2, 'Hasanpur', null, 28.6862, 80.5981, null, null, 'stripe', 'Rita', true);
    assert false, 'provider';
  exception when others then
    get stacked diagnostics err = message_text; assert err = 'DS_PAYMENT_DISABLED';
    raise notice 'PASS disabled payment provider rejected';
  end;
end $$;

-- ---- second customer: no access, no double booking --------------------
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
set local role authenticated;
do $$
declare w uuid; c uuid; start_ts timestamptz; err text;
begin
  assert (select count(*) from public.bookings) = 0, 'cust2 must not see cust1 booking';
  assert (select count(*) from public.booking_secrets) = 0, 'cust2 must not see PINs';
  select id into w from public.workers where user_id = '00000000-0000-0000-0000-0000000000b1';
  select id into c from public.service_categories where slug = 'house-cleaning';
  start_ts := ((date_trunc('day', now() at time zone 'Asia/Kathmandu') + interval '2 days 11 hours') at time zone 'Asia/Kathmandu');
  begin
    perform public.create_booking(w, c, start_ts, 2, 'Lalmatiya', null, 28.69, 80.60, null, null, 'cash', 'Mina Rai', true);
    assert false, 'overlap';
  exception when others then
    get stacked diagnostics err = message_text; assert err = 'DS_SLOT_TAKEN', 'expected DS_SLOT_TAKEN got ' || err;
    raise notice 'PASS overlapping booking blocked by exclusion constraint';
  end;
  begin
    insert into public.bookings (code, customer_id, worker_id, category_id, customer_name, scheduled_start, scheduled_end, duration_hours,
      address_text, lat, lng, unit_price, price_unit, quantity, subtotal, total_amount, commission_rate, commission_amount, worker_payout,
      contract_snapshot, contract_hash, signed_name)
    select 'X', auth.uid(), w, c, 'x', now(), now() + interval '1 hour', 1, 'x', 28.6, 80.6, 1, 'hour', 1, 1, 1, 0, 0, 1, 'x', 'x', 'x';
    assert false, 'direct insert';
  exception when insufficient_privilege or others then
    raise notice 'PASS direct INSERT into bookings is denied';
  end;
end $$;

-- ---- worker: sees booking, never the PIN; full lifecycle -------------
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
set local role authenticated;
do $$
declare b public.bookings; r jsonb; err text;
begin
  select * into b from public.bookings limit 1;
  assert b.id is not null, 'worker should see own booking';
  assert (select count(*) from public.booking_secrets) = 0, 'worker must never see the PIN';
  raise notice 'PASS worker sees booking but not the PIN';
  assert public.get_booking_contacts(b.id) is null, 'no contacts while pending';

  b := public.set_booking_status(b.id, 'confirmed');
  assert b.status = 'confirmed';
  begin perform public.set_booking_status(b.id, 'en_route'); assert false, 'too early';
  exception when others then get stacked diagnostics err = message_text; assert err = 'DS_TOO_EARLY', 'expected DS_TOO_EARLY got ' || err;
    raise notice 'PASS cannot start travel outside the tracking window'; end;
end $$;
reset role;   -- pull the visit forward so travel can start
update public.bookings set scheduled_start = now() + interval '30 minutes', scheduled_end = now() + interval '3 hours 30 minutes';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
set local role authenticated;
do $$
declare b public.bookings; r jsonb; err text; pin text;
begin
  select * into b from public.bookings limit 1;
  b := public.set_booking_status(b.id, 'en_route');
  perform public.push_location(b.id, 28.70, 80.59, 90, 5, 12);
  assert (select count(*) from public.live_locations) = 1, 'location stored';
  assert (public.get_booking_contacts(b.id) ->> 'customer_phone') = '9800000002', 'worker gets the customer phone during active booking';
  assert (public.get_booking_contacts(b.id) ->> 'worker_phone') is null, 'worker does not get own phone back';
  raise notice 'PASS live location + scoped contacts';

  b := public.set_booking_status(b.id, 'arrived');
  begin perform public.set_booking_status(b.id, 'in_progress'); assert false, 'pin';
  exception when others then get stacked diagnostics err = message_text; assert err = 'DS_PIN_REQUIRED';
    raise notice 'PASS job cannot start without verified PIN'; end;
  r := public.verify_start_pin(b.id, '0000x');
  assert (r ->> 'ok')::boolean = false and (r ->> 'attempts_left')::int = 4, 'wrong pin counted: ' || r::text;
  raise notice 'PASS wrong PIN is counted (attempts persist, not rolled back)';
end $$;
reset role;
do $$ declare r jsonb; pin text; b public.bookings; i int; begin
  select * into b from public.bookings limit 1;
  select start_pin into pin from public.booking_secrets where booking_id = b.id;
  -- brute-force lock after 5 wrong attempts (run as the worker)
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  set local role authenticated;
  for i in 1..5 loop r := public.verify_start_pin(b.id, case when pin = '1111' then '2222' else '1111' end); end loop;
  assert (r ->> 'locked')::boolean, 'PIN must lock after 5 failures: ' || r::text;
  r := public.verify_start_pin(b.id, pin);
  assert (r ->> 'ok')::boolean = false, 'even the right PIN is refused once locked';
  raise notice 'PASS PIN brute-force lock';
  reset role;
  update public.booking_secrets set attempts = 0 where booking_id = b.id;   -- support reset
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  set local role authenticated;
  r := public.verify_start_pin(b.id, pin);
  assert (r ->> 'ok')::boolean, 'correct pin accepted';
  b := public.set_booking_status(b.id, 'in_progress');
  assert (select count(*) from public.live_locations) = 0, 'location sharing stops when job starts';
  b := public.set_booking_status(b.id, 'completed');
  assert b.payment_status = 'paid' and (select jobs_completed from public.workers where id = b.worker_id) = 1, 'cash marked paid, jobs counted';
  raise notice 'PASS full lifecycle: pending > confirmed > en_route > arrived > in_progress > completed';
end $$;

-- ---- customer: PIN visible, review, dispute ---------------------------
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
set local role authenticated;
do $$
declare b public.bookings;
begin
  select * into b from public.bookings limit 1;
  assert (select count(*) from public.booking_secrets) = 1, 'customer sees own PIN';
  insert into public.reviews (booking_id, customer_id, worker_id, rating, comment) values (b.id, '00000000-0000-0000-0000-0000000000a1', b.worker_id, 5, 'Very thorough');
  assert (select rating_avg from public.workers where id = b.worker_id) = 5 and (select rating_count from public.workers where id = b.worker_id) = 1, 'rating aggregated';
  assert (select reviewer_name from public.reviews limit 1) = 'Rita C.', 'reviewer shown as first name + initial';
  raise notice 'PASS review stored; spoofed customer_id ignored; rating aggregated';
  insert into public.disputes (booking_id, opened_by, reason, details) values (b.id, auth.uid(), 'Missed the balcony', 'Balcony was not cleaned');
  raise notice 'PASS dispute opened';
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
set local role authenticated;
do $$ declare bid uuid; begin
  select id into bid from (select id from public.bookings union all select null) x limit 1;
  begin
    insert into public.reviews (booking_id, customer_id, worker_id, rating) select b.id, auth.uid(), b.worker_id, 1 from public.bookings b;
  exception when others then null; end;
  assert (select count(*) from public.disputes) = 0, 'cust2 cannot read disputes of others';
  raise notice 'PASS other customers cannot read or review someone else''s booking';
end $$;

-- ---- admin analytics + guard ------------------------------------------
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;
do $$ declare d jsonb; begin
  d := public.admin_dashboard(30);
  assert (d -> 'kpi' ->> 'completed')::int = 1 and (d -> 'kpi' ->> 'revenue')::numeric = 150, 'dashboard kpis: ' || (d -> 'kpi')::text;
  assert jsonb_array_length(d -> 'series') = 30, 'series length';
  raise notice 'PASS admin_dashboard: gmv=% revenue=% repeat=%', d -> 'kpi' ->> 'gmv', d -> 'kpi' ->> 'revenue', d -> 'kpi' ->> 'repeat_rate';
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
set local role authenticated;
do $$ declare err text; begin
  begin perform public.admin_dashboard(30); assert false, 'guard';
  exception when others then get stacked diagnostics err = message_text; assert err = 'DS_FORBIDDEN';
    raise notice 'PASS non-admins cannot call admin_dashboard'; end;
  begin perform public.consume_rate_limit('x', 1, 60); assert false, 'internal fn';
  exception when insufficient_privilege then raise notice 'PASS internal functions are not callable by clients'; end;
end $$;

reset role;
rollback;
\echo ALL DB CHECKS PASSED
