-- ============================================================
-- Migration 001: Initial Schema — Ace Edu CBT
-- Run this once against your Supabase project via the SQL editor
-- or the Supabase CLI:  supabase db push
-- ============================================================

-- ============================================================
-- PROFILES  (extends Supabase auth.users)
-- ============================================================
create table if not exists profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  full_name   text        not null,
  email       text        not null,
  is_admin    boolean     not null default false,
  created_at  timestamptz default now()
);

-- ============================================================
-- ADMIN SETTINGS  (always exactly one row, id = 1)
-- ============================================================
create table if not exists admin_settings (
  id               int         primary key default 1,
  whatsapp_number  text        not null default '',
  bank_name        text        not null default '',
  account_number   text        not null default '',
  account_name     text        not null default '',
  contact_email    text,
  contact_phone    text,
  updated_at       timestamptz default now(),
  constraint single_row check (id = 1)
);

-- Guarantee the one row exists immediately
insert into admin_settings (id)
values (1)
on conflict (id) do nothing;

-- ============================================================
-- QUIZZES
-- ============================================================
create table if not exists quizzes (
  id               uuid        primary key default gen_random_uuid(),
  title            text        not null,
  description      text,
  price            numeric(10,2) not null,
  duration_minutes int         not null,
  pass_mark        int         not null,   -- percentage, e.g. 50
  is_published     boolean     default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ============================================================
-- QUESTIONS
-- ============================================================
create table if not exists questions (
  id                   uuid    primary key default gen_random_uuid(),
  quiz_id              uuid    not null references quizzes(id) on delete cascade,
  question_text        text    not null,
  question_image_url   text,                    -- nullable, Supabase Storage URL
  options              jsonb   not null,         -- [{"text":"...","image_url":"..."},...]
  correct_option_index int     not null,
  explanation          text,
  order_index          int     not null default 0,
  created_at           timestamptz default now()
);

-- ============================================================
-- CODES
-- ============================================================
create table if not exists codes (
  id         uuid        primary key default gen_random_uuid(),
  quiz_id    uuid        not null references quizzes(id) on delete cascade,
  code       text        not null unique,   -- e.g. ACE-7F3K9X
  status     text        not null default 'unused'  -- 'unused' | 'used' | 'revoked'
               check (status in ('unused','used','revoked')),
  used_by    uuid        references profiles(id),
  used_at    timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- UNLOCKED QUIZZES
-- ============================================================
create table if not exists unlocked_quizzes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references profiles(id) on delete cascade,
  quiz_id     uuid        not null references quizzes(id) on delete cascade,
  code_id     uuid        references codes(id),
  unlocked_at timestamptz default now(),
  unique (user_id, quiz_id)
);

-- ============================================================
-- ATTEMPTS  (lean — no per-answer data stored)
-- ============================================================
create table if not exists attempts (
  id                  uuid    primary key default gen_random_uuid(),
  user_id             uuid    not null references profiles(id) on delete cascade,
  quiz_id             uuid    not null references quizzes(id) on delete cascade,
  score               int     not null,   -- percentage
  correct_count       int     not null,
  wrong_count         int     not null,
  total_questions     int     not null,
  time_taken_seconds  int     not null,
  created_at          timestamptz default now()
);

-- ============================================================
-- ADS
-- ============================================================
create table if not exists ads (
  id               uuid        primary key default gen_random_uuid(),
  image_url        text        not null,
  link_url         text        not null,
  duration_seconds int         not null,
  is_active        boolean     default true,
  created_at       timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_questions_quiz    on questions(quiz_id);
create index if not exists idx_codes_quiz        on codes(quiz_id);
create index if not exists idx_codes_status      on codes(status);
create index if not exists idx_attempts_user     on attempts(user_id);
create index if not exists idx_attempts_quiz     on attempts(quiz_id);
create index if not exists idx_unlocked_user     on unlocked_quizzes(user_id);
create index if not exists idx_profiles_admin    on profiles(is_admin);
