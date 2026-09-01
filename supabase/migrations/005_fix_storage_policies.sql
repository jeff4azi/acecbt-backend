-- ============================================================
-- Migration 005: Fix Storage Buckets & Policies — Ace Edu CBT
-- Run this in the Supabase SQL editor if image uploads fail.
-- It is fully idempotent — safe to run multiple times.
-- ============================================================

-- ── 1. Ensure buckets exist and are public ────────────────────
insert into storage.buckets (id, name, public)
values
  ('question-images', 'question-images', true),
  ('option-images',   'option-images',   true),
  ('ad-images',       'ad-images',       true)
on conflict (id) do update set public = true;   -- force public if it was set to false

-- ── 2. Drop old policies so we can recreate cleanly ──────────
-- (DROP IF EXISTS avoids errors when they don't exist)

-- Read policies
drop policy if exists "storage: question-images public read"  on storage.objects;
drop policy if exists "storage: option-images public read"    on storage.objects;
drop policy if exists "storage: ad-images public read"        on storage.objects;

-- Write (insert) policies
drop policy if exists "storage: question-images admin write"  on storage.objects;
drop policy if exists "storage: option-images admin write"    on storage.objects;
drop policy if exists "storage: ad-images admin write"        on storage.objects;

-- Delete policies
drop policy if exists "storage: question-images admin delete" on storage.objects;
drop policy if exists "storage: option-images admin delete"   on storage.objects;
drop policy if exists "storage: ad-images admin delete"       on storage.objects;

-- Update policies (needed if upsert is ever used)
drop policy if exists "storage: question-images admin update" on storage.objects;
drop policy if exists "storage: option-images admin update"   on storage.objects;
drop policy if exists "storage: ad-images admin update"       on storage.objects;

-- ── 3. Recreate all storage policies ─────────────────────────

-- PUBLIC READ — anyone (incl. unauthenticated) can fetch images
create policy "storage: question-images public read"
  on storage.objects for select
  using (bucket_id = 'question-images');

create policy "storage: option-images public read"
  on storage.objects for select
  using (bucket_id = 'option-images');

create policy "storage: ad-images public read"
  on storage.objects for select
  using (bucket_id = 'ad-images');

-- ADMIN INSERT — only admin users may upload
create policy "storage: question-images admin write"
  on storage.objects for insert
  with check (
    bucket_id = 'question-images'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "storage: option-images admin write"
  on storage.objects for insert
  with check (
    bucket_id = 'option-images'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "storage: ad-images admin write"
  on storage.objects for insert
  with check (
    bucket_id = 'ad-images'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ADMIN UPDATE — needed for upsert operations
create policy "storage: question-images admin update"
  on storage.objects for update
  using (
    bucket_id = 'question-images'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "storage: option-images admin update"
  on storage.objects for update
  using (
    bucket_id = 'option-images'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "storage: ad-images admin update"
  on storage.objects for update
  using (
    bucket_id = 'ad-images'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ADMIN DELETE
create policy "storage: question-images admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'question-images'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "storage: option-images admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'option-images'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

create policy "storage: ad-images admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'ad-images'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
