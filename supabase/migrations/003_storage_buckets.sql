-- ============================================================
-- Migration 003: Storage Buckets — Ace Edu CBT
-- All buckets are public (no signed URLs needed).
-- ============================================================

-- Create the three buckets (idempotent — ignore if they already exist)
insert into storage.buckets (id, name, public)
values
  ('question-images', 'question-images', true),
  ('option-images',   'option-images',   true),
  ('ad-images',       'ad-images',       true)
on conflict (id) do nothing;

-- ── Storage policies ──────────────────────────────────────────

-- Public can read all files in all three buckets
create policy "storage: question-images public read"
  on storage.objects for select
  using (bucket_id = 'question-images');

create policy "storage: option-images public read"
  on storage.objects for select
  using (bucket_id = 'option-images');

create policy "storage: ad-images public read"
  on storage.objects for select
  using (bucket_id = 'ad-images');

-- Only admins can upload / delete
create policy "storage: question-images admin write"
  on storage.objects for insert
  with check (
    bucket_id = 'question-images'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "storage: option-images admin write"
  on storage.objects for insert
  with check (
    bucket_id = 'option-images'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "storage: ad-images admin write"
  on storage.objects for insert
  with check (
    bucket_id = 'ad-images'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "storage: question-images admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'question-images'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "storage: option-images admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'option-images'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "storage: ad-images admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'ad-images'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );
