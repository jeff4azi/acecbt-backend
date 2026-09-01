-- ============================================================
-- Migration 005: Auto-create profile row on user sign-up
-- ============================================================
-- This trigger fires after every insert into auth.users (i.e. every
-- new Supabase Auth sign-up) and upserts a matching row into public.profiles.
-- It pulls full_name from raw_user_meta_data so the frontend no longer needs
-- to do a separate profiles.insert() after signUp().
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- Run as the function owner (postgres), not the calling role,
-- so it can bypass RLS on profiles.
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update
    set
      full_name = coalesce(excluded.full_name, profiles.full_name),
      email     = coalesce(excluded.email,     profiles.email);

  return new;
end;
$$;

-- Drop first in case a previous version of this migration was applied
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
