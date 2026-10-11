-- =====================================================================
-- 0005 analytics for the admin dashboard (one round trip, admin only)
-- Day buckets use Asia/Kathmandu so "today" matches what staff see.
-- =====================================================================
create or replace function public.admin_dashboard(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_today date := (now() at time zone 'Asia/Kathmandu')::date;
  v_from timestamptz := ((v_today - (v_days - 1))::timestamp) at time zone 'Asia/Kathmandu';
  v_prev timestamptz := ((v_today - (2 * v_days - 1))::timestamp) at time zone 'Asia/Kathmandu';
  v_kpi jsonb; v_series jsonb; v_cat jsonb; v_top jsonb; v_status jsonb; v_cohort jsonb;
begin
  if not public.is_admin() then raise exception 'DS_FORBIDDEN'; end if;

  select jsonb_build_object(
    'gmv',            coalesce(sum(total_amount) filter (where status = 'completed' and completed_at >= v_from), 0),
    'gmv_prev',       coalesce(sum(total_amount) filter (where status = 'completed' and completed_at >= v_prev and completed_at < v_from), 0),
    'revenue',        coalesce(sum(commission_amount) filter (where status = 'completed' and completed_at >= v_from), 0),
    'bookings',       count(*) filter (where created_at >= v_from),
    'bookings_prev',  count(*) filter (where created_at >= v_prev and created_at < v_from),
    'completed',      count(*) filter (where status = 'completed' and completed_at >= v_from),
    'cancelled',      count(*) filter (where status in ('cancelled', 'declined') and created_at >= v_from),
    'in_flight',      count(*) filter (where status in ('confirmed', 'en_route', 'arrived', 'in_progress'))
  ) into v_kpi from public.bookings;

  v_kpi := v_kpi || jsonb_build_object(
    'completion_rate', case when (v_kpi ->> 'completed')::numeric + (v_kpi ->> 'cancelled')::numeric = 0 then null
                            else round((v_kpi ->> 'completed')::numeric * 100 / ((v_kpi ->> 'completed')::numeric + (v_kpi ->> 'cancelled')::numeric), 1) end,
    'avg_order', case when (v_kpi ->> 'completed')::numeric = 0 then 0
                      else round((v_kpi ->> 'gmv')::numeric / (v_kpi ->> 'completed')::numeric, 0) end,
    'new_customers',   (select count(*) from public.profiles where created_at >= v_from and role = 'customer'),
    'total_customers', (select count(*) from public.profiles where role = 'customer'),
    'active_workers',  (select count(*) from public.workers where status = 'approved'),
    'pending_workers', (select count(*) from public.workers where status = 'pending'),
    'open_disputes',   (select count(*) from public.disputes where status in ('open', 'under_review')),
    'repeat_rate', (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where n >= 2) / count(*), 1) end
                      from (select customer_id, count(*) n from public.bookings where status = 'completed' group by 1) t));

  select coalesce(jsonb_agg(jsonb_build_object('date', d.day, 'bookings', coalesce(b.n, 0), 'revenue', coalesce(b.gmv, 0)) order by d.day), '[]'::jsonb)
    into v_series
    from generate_series(v_today - (v_days - 1), v_today, interval '1 day') as g(day_ts)
    cross join lateral (select g.day_ts::date as day) d
    left join (select (scheduled_start at time zone 'Asia/Kathmandu')::date as day, count(*) filter (where status not in ('cancelled', 'declined')) n,
                      sum(total_amount) filter (where status = 'completed') gmv
                 from public.bookings where scheduled_start >= v_from group by 1) b on b.day = d.day;

  select coalesce(jsonb_agg(x order by (x ->> 'revenue')::numeric desc), '[]'::jsonb) into v_cat from (
    select jsonb_build_object('name', c.name_en, 'bookings', count(*), 'revenue', coalesce(sum(b.total_amount), 0)) x
      from public.bookings b join public.service_categories c on c.id = b.category_id
     where b.status = 'completed' and b.completed_at >= v_from group by c.id, c.name_en) s;

  select coalesce(jsonb_agg(x order by (x ->> 'revenue')::numeric desc), '[]'::jsonb) into v_top from (
    select jsonb_build_object('id', w.id, 'name', w.display_name, 'jobs', count(*), 'revenue', sum(b.worker_payout), 'rating', w.rating_avg) x
      from public.bookings b join public.workers w on w.id = b.worker_id
     where b.status = 'completed' and b.completed_at >= v_from group by w.id order by sum(b.worker_payout) desc limit 8) s;

  select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) into v_status
    from (select status, count(*) n from public.bookings where created_at >= v_from group by 1) s;

  -- retention: first completed booking month -> share of that cohort booking again in month +N
  select coalesce(jsonb_agg(jsonb_build_object('cohort', cohort, 'size', size, 'retained', retained) order by cohort), '[]'::jsonb) into v_cohort from (
    with firsts as (
      select customer_id, date_trunc('month', min(scheduled_start at time zone 'Asia/Kathmandu')) as cohort
        from public.bookings where status = 'completed' group by 1),
    activity as (
      select distinct customer_id, date_trunc('month', scheduled_start at time zone 'Asia/Kathmandu') as m
        from public.bookings where status = 'completed')
    select to_char(f.cohort, 'YYYY-MM') as cohort,
           count(distinct f.customer_id) as size,
           (select jsonb_agg(coalesce(r.n, 0) order by i.i)
              from generate_series(0, 5) as i(i)
              left join lateral (select count(distinct a.customer_id) n from activity a join firsts f2 on f2.customer_id = a.customer_id
                                  where f2.cohort = f.cohort and a.m = f.cohort + make_interval(months => i.i)) r on true) as retained
      from firsts f where f.cohort >= date_trunc('month', now() at time zone 'Asia/Kathmandu') - interval '5 months'
     group by f.cohort) c;

  return jsonb_build_object('days', v_days, 'kpi', v_kpi, 'series', v_series, 'by_category', v_cat,
                            'top_workers', v_top, 'status', v_status, 'cohorts', v_cohort);
end $$;

revoke all on function public.admin_dashboard(integer) from public, anon;
grant execute on function public.admin_dashboard(integer) to authenticated;
