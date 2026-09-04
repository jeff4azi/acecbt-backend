-- ============================================================
-- Migration 008: Add question_limit to quizzes — Ace Edu CBT
-- Allows admins to set how many questions a student is served
-- per attempt from the full question pool.
-- ============================================================

alter table quizzes
  add column if not exists question_limit int
    default null
    check (question_limit is null or question_limit > 0);

comment on column quizzes.question_limit is
  'Optional cap on how many questions a student sees per attempt.
   NULL means the student receives the entire pool (still shuffled).
   Must be NULL or a positive integer.';
