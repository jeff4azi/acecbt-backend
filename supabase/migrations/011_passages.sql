-- ============================================================
-- Migration 011: Passage support for questions
-- ============================================================
-- A passage is a block of text (prose, poem, data table, etc.)
-- that one or more questions in the same quiz reference.
-- Questions that belong to a passage carry a passage_id FK.
-- Questions without a passage have passage_id = NULL (unchanged
-- behaviour for all existing data).
-- ============================================================

-- ── passages table ────────────────────────────────────────────

create table if not exists passages (
  id          uuid        primary key default gen_random_uuid(),
  quiz_id     uuid        not null references quizzes(id) on delete cascade,
  title       text,                        -- optional label, e.g. "Passage 1"
  body        text        not null,        -- the actual reading text / data
  order_index int         not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_passages_quiz on passages(quiz_id);

-- ── link questions to passages ────────────────────────────────

alter table questions
  add column if not exists passage_id uuid references passages(id) on delete set null;

create index if not exists idx_questions_passage on questions(passage_id);

-- ── RLS ───────────────────────────────────────────────────────
-- Passages are publicly readable (students need them during a quiz).
-- Only service-role (admin backend) can write.

alter table passages enable row level security;

create policy "passages: public read"
  on passages for select
  using (true);

-- Service-role key bypasses RLS entirely, so no explicit insert/update/delete
-- policy is needed for the backend. Students never write passages.
