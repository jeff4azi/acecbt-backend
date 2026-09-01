-- ============================================================
-- Migration 002: Row Level Security Policies — Ace Edu CBT
-- ============================================================

-- Enable RLS on every table
alter table profiles          enable row level security;
alter table admin_settings    enable row level security;
alter table quizzes           enable row level security;
alter table questions         enable row level security;
alter table codes             enable row level security;
alter table unlocked_quizzes  enable row level security;
alter table attempts          enable row level security;
alter table ads               enable row level security;

-- ── Helper: is the current user an admin? ──────────────────
-- Used in policies below as a reusable expression.
-- We check profiles.is_admin directly instead of a DB function
-- so there is no extra round-trip.

-- ============================================================
-- PROFILES
-- ============================================================
-- Anyone can read their own profile
create policy "profiles: own read"
  on profiles for select
  using (auth.uid() = id);

-- Admins can read all profiles (for dashboard user count etc.)
create policy "profiles: admin read all"
  on profiles for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- A user can insert their own profile (on sign-up)
create policy "profiles: own insert"
  on profiles for insert
  with check (auth.uid() = id);

-- A user can update their own non-admin fields
create policy "profiles: own update"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and is_admin = (select is_admin from profiles where id = auth.uid()));

-- ============================================================
-- ADMIN SETTINGS  — public read, admin-only write
-- ============================================================
create policy "settings: public read"
  on admin_settings for select
  using (true);

create policy "settings: admin write"
  on admin_settings for update
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ============================================================
-- QUIZZES  — published ones are public; admin sees all
-- ============================================================
create policy "quizzes: public read published"
  on quizzes for select
  using (is_published = true);

create policy "quizzes: admin full access"
  on quizzes for all
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ============================================================
-- QUESTIONS  — readable by authenticated users (quiz is already
--              gated by unlock check in the API); admin writes
-- ============================================================
create policy "questions: auth read"
  on questions for select
  using (auth.uid() is not null);

create policy "questions: admin write"
  on questions for all
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ============================================================
-- CODES  — admin only (students never hit this table directly)
-- ============================================================
create policy "codes: admin full access"
  on codes for all
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ============================================================
-- UNLOCKED QUIZZES
-- ============================================================
create policy "unlocked: own read"
  on unlocked_quizzes for select
  using (auth.uid() = user_id);

create policy "unlocked: own insert"
  on unlocked_quizzes for insert
  with check (auth.uid() = user_id);

create policy "unlocked: admin read all"
  on unlocked_quizzes for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ============================================================
-- ATTEMPTS
-- ============================================================
create policy "attempts: own read"
  on attempts for select
  using (auth.uid() = user_id);

create policy "attempts: own insert"
  on attempts for insert
  with check (auth.uid() = user_id);

-- Leaderboard: any authenticated user can read attempts for leaderboard
create policy "attempts: auth read for leaderboard"
  on attempts for select
  using (auth.uid() is not null);

create policy "attempts: admin full access"
  on attempts for all
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ============================================================
-- ADS  — public read active ads; admin manages all
-- ============================================================
create policy "ads: public read active"
  on ads for select
  using (is_active = true);

create policy "ads: admin full access"
  on ads for all
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );
