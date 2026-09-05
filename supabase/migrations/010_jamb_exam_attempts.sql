-- ============================================================
-- Migration 009: JAMB Exam Mode — attempt storage
-- ============================================================
-- jamb_exam_attempts stores a full 4-subject JAMB practice attempt.
-- Each row holds the aggregated score (0–400) plus a JSONB breakdown
-- of per-subject scores so the result/review screen can reconstruct
-- exactly what the student answered.
-- ============================================================

create table if not exists jamb_exam_attempts (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references profiles(id) on delete cascade,

  -- the 4 quiz IDs the student used (English + 3 others)
  english_quiz_id   uuid        not null references quizzes(id),
  subject2_quiz_id  uuid        not null references quizzes(id),
  subject3_quiz_id  uuid        not null references quizzes(id),
  subject4_quiz_id  uuid        not null references quizzes(id),

  -- total score out of 400
  total_score       integer     not null check (total_score >= 0 and total_score <= 400),

  -- per-subject scores (0–100 each)
  english_score     integer     not null,
  subject2_score    integer     not null,
  subject3_score    integer     not null,
  subject4_score    integer     not null,

  -- time taken in seconds (max 7200 = 2 hours)
  time_taken_seconds integer    not null,

  -- full answer breakdown stored for review screen
  -- shape: { [subjectKey]: { questions: [...per_question] } }
  breakdown         jsonb       not null default '{}',

  created_at        timestamptz not null default now()
);

-- Index for leaderboard queries (score desc, time asc, per user)
create index if not exists jamb_attempts_score_idx
  on jamb_exam_attempts(total_score desc, time_taken_seconds asc);

create index if not exists jamb_attempts_user_idx
  on jamb_exam_attempts(user_id);

create index if not exists jamb_attempts_created_idx
  on jamb_exam_attempts(created_at desc);

-- RLS
alter table jamb_exam_attempts enable row level security;

create policy "jamb: own read"
  on jamb_exam_attempts for select
  using (auth.uid() = user_id);

create policy "jamb: own insert"
  on jamb_exam_attempts for insert
  with check (auth.uid() = user_id);

create policy "jamb: public leaderboard read"
  on jamb_exam_attempts for select
  using (true);
