-- =====================================================================
-- 0004 storage buckets + policies
--   public-assets : logos, banners, category images (admin writes)
--   avatars       : <uid>/file    (owner writes, public read via CDN URL)
--   worker-docs   : <uid>/file    (private: owner + admin only)
-- SVG is deliberately NOT allowed: scripts inside SVG are an XSS vector.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-assets', 'public-assets', true,  3145728, array['image/png', 'image/jpeg', 'image/webp']),
  ('avatars',       'avatars',       true,  2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('worker-docs',   'worker-docs',   false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

create policy "assets admin all" on storage.objects for all to authenticated
  using (bucket_id = 'public-assets' and public.is_admin())
  with check (bucket_id = 'public-assets' and public.is_admin());

create policy "avatars owner all" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "worker docs owner or admin read" on storage.objects for select to authenticated
  using (bucket_id = 'worker-docs' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
create policy "worker docs owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'worker-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "worker docs owner update" on storage.objects for update to authenticated
  using (bucket_id = 'worker-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "worker docs owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'worker-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);
