-- ============================================================
-- Migration 008: Add JAMB metadata columns to quizzes
-- ============================================================
-- is_jamb     — true when this quiz was created with the JAMB toggle on
-- jamb_subject — one of the canonical JAMB subject names
-- jamb_year    — 4-digit exam year (e.g. 2023)
-- The title column continues to store the composed string
-- "JAMB [Subject] [Year]" for display everywhere.
-- ============================================================

alter table quizzes
  add column if not exists is_jamb       boolean  not null default false,
  add column if not exists jamb_subject  text     null,
  add column if not exists jamb_year     integer  null;
