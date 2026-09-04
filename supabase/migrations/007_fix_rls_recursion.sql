-- ============================================================
-- Migration 007: Fix infinite recursion in profiles RLS policies
-- ============================================================
-- The "profiles: admin read all" policy referenced the profiles
-- table from within a profiles policy, causing infinite recursion.
-- Fix: use a SECURITY DEFINER function that bypasses RLS to check
-- admin status, breaking the recursive loop.
-- ============================================================

-- Step 1: Create a helper function that checks admin status
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Step 2: Drop the recursive profiles policies
drop policy if exists "profiles: admin read all" on profiles;
drop policy if exists "profiles: own update" on profiles;

-- Step 3: Re-create profiles policies using the safe helper function
create policy "profiles: admin read all"
  on profiles for select
  using (public.is_admin());

create policy "profiles: own update"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Step 4: Replace all other admin-check policies to use the helper too
-- (prevents the same recursion in those tables when admins are logged in)

-- admin_settings
drop policy if exists "settings: admin write" on admin_settings;
create policy "settings: admin write"
  on admin_settings for update
  using (public.is_admin());

-- quizzes
drop policy if exists "quizzes: admin full access" on quizzes;
create policy "quizzes: admin full access"
  on quizzes for all
  using (public.is_admin());

-- questions
drop policy if exists "questions: admin write" on questions;
create policy "questions: admin write"
  on questions for all
  using (public.is_admin());

-- codes
drop policy if exists "codes: admin full access" on codes;
create policy "codes: admin full access"
  on codes for all
  using (public.is_admin());

-- unlocked_quizzes
drop policy if exists "unlocked: admin read all" on unlocked_quizzes;
create policy "unlocked: admin read all"
  on unlocked_quizzes for select
  using (public.is_admin());

-- attempts
drop policy if exists "attempts: admin full access" on attempts;
create policy "attempts: admin full access"
  on attempts for all
  using (public.is_admin());

-- ads
drop policy if exists "ads: admin full access" on ads;
create policy "ads: admin full access"
  on ads for all
  using (public.is_admin());
