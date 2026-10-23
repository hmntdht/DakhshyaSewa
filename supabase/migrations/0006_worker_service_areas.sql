-- ──────────────────────────────────────────────────────────────────────────
-- 0006_worker_service_areas.sql
-- Stores the geographic service circle each worker draws during onboarding.
-- One row per worker (upserted on profile update).
-- ──────────────────────────────────────────────────────────────────────────

create table if not exists worker_service_areas (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references workers(id) on delete cascade,
  center_lat  double precision not null,
  center_lng  double precision not null,
  radius_km   numeric(6,2) not null check (radius_km >= 0.5 and radius_km <= 50),
  updated_at  timestamptz not null default now(),
  constraint worker_service_areas_worker_id_key unique (worker_id)
);

-- Keep updated_at cuarrent on every upsert
create or replace function set_worker_area_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_worker_area_updated_at on worker_service_areas;
create trigger trg_worker_area_updated_at
  before update on worker_service_areas
  for each row execute procedure set_worker_area_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table worker_service_areas enable row level security;

-- Workers can manage their own area
create policy "worker_area_self" on worker_service_areas
  using (
    worker_id in (select id from workers where user_id = auth.uid())
  )
  with check (
    worker_id in (select id from workers where user_id = auth.uid())
  );

-- Authenticated users (customers) can READ all areas (for the "in-range" badge)
create policy "worker_area_public_read" on worker_service_areas
  for select using (auth.role() = 'authenticated');

-- Admin full access
create policy "worker_area_admin" on worker_service_areas
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

comment on table worker_service_areas is 'One geographic service circle per worker, drawn during onboarding or profile update.';
