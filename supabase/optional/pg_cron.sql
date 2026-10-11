-- Optional: run housekeeping inside Postgres instead of calling /api/cron/maintenance.
-- Enable the extension first: Supabase Dashboard -> Database -> Extensions -> pg_cron.
-- What it does: cancels pending requests nobody answered (and unpaid online bookings after 30 min), releases their promo codes,
-- purges tracking breadcrumbs older than 14 days and stale rate-limit rows.
select cron.schedule('ds-maintenance', '*/10 * * * *', $$ select public.expire_stale_bookings(); $$);

-- To remove:  select cron.unschedule('ds-maintenance');
