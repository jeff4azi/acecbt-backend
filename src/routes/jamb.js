import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { JAMB_SUBJECTS } from "../lib/jambSubjects.js";

const router = Router();

// Question limits per subject
const ENGLISH_LIMIT = 60;
const OTHER_LIMIT = 40;
const MAX_DURATION_SECONDS = 7200; // 2 hours

// Fisher-Yates shuffle (in-place on a copy)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Week helpers (same as attempts.js) ────────────────────────────────────────
function currentWeekWindow() {
  const now = new Date();
  const daysFromMonday = (now.getUTCDay() + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
  return { weekStart, weekEnd };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/jamb/quizzes
// Returns all published JAMB quizzes grouped by subject.
// Shape: { [subject]: [{ id, title, jamb_year, price, question_count }] }
// ─────────────────────────────────────────────────────────────────────────────
router.get("/quizzes", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .select("id, title, jamb_subject, jamb_year, price, is_published")
    .eq("is_jamb", true)
    .eq("is_published", true)
    .order("jamb_year", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Attach question counts
  const ids = (data ?? []).map((q) => q.id);
  let questionCounts = {};
  if (ids.length > 0) {
    const { data: qRows } = await supabaseAdmin
      .from("questions")
      .select("quiz_id")
      .in("quiz_id", ids);
    for (const r of qRows ?? []) {
      questionCounts[r.quiz_id] = (questionCounts[r.quiz_id] ?? 0) + 1;
    }
  }

  // Group by subject, preserve canonical order
  const grouped = {};
  for (const subj of JAMB_SUBJECTS) {
    const quizzes = (data ?? [])
      .filter((q) => q.jamb_subject === subj)
      .map((q) => ({ ...q, question_count: questionCounts[q.id] ?? 0 }));
    if (quizzes.length > 0) grouped[subj] = quizzes;
  }

  res.json(grouped);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/jamb/questions?english=<id>&s2=<id>&s3=<id>&s4=<id>
// Requires auth. Fetches shuffled questions for all 4 selected quizzes.
// Validates that the user has unlocked each quiz.
// English gets 60 questions; others get 40.
// Response: { english, subject2, subject3, subject4 }
//   each value: { quizId, subject, year, questions[] }
// ─────────────────────────────────────────────────────────────────────────────
router.get("/questions", requireAuth, async (req, res) => {
  const { english, s2, s3, s4 } = req.query;
  const userId = req.user.id;

  if (!english || !s2 || !s3 || !s4) {
    return res
      .status(400)
      .json({ error: "All 4 quiz IDs are required (english, s2, s3, s4)" });
  }

  const quizIds = [english, s2, s3, s4];

  // Verify all 4 are unlocked by this user
  const { data: unlocked } = await supabaseAdmin
    .from("unlocked_quizzes")
    .select("quiz_id")
    .eq("user_id", userId)
    .in("quiz_id", quizIds);

  const unlockedSet = new Set((unlocked ?? []).map((u) => u.quiz_id));
  const locked = quizIds.filter((id) => !unlockedSet.has(id));
  if (locked.length > 0) {
    return res
      .status(403)
      .json({ error: "Some quizzes are not unlocked", locked });
  }

  // Fetch quiz metadata + questions for all 4 in parallel
  const [quizzesRes, passagesRes, ...questionResults] = await Promise.all([
    supabaseAdmin
      .from("quizzes")
      .select("id, title, jamb_subject, jamb_year")
      .in("id", quizIds),
    supabaseAdmin
      .from("passages")
      .select("id, title, body")
      .in("quiz_id", quizIds),
    ...quizIds.map((id) =>
      supabaseAdmin
        .from("questions")
        .select("*")
        .eq("quiz_id", id)
        .order("order_index", { ascending: true }),
    ),
  ]);

  if (quizzesRes.error)
    return res.status(500).json({ error: quizzesRes.error.message });

  const quizMap = {};
  for (const q of quizzesRes.data ?? []) quizMap[q.id] = q;

  // Build passage map keyed by passage id
  const passageMap = {};
  for (const p of passagesRes.data ?? []) {
    passageMap[p.id] = { title: p.title, body: p.body };
  }

  const keys = ["english", "subject2", "subject3", "subject4"];
  const limits = [ENGLISH_LIMIT, OTHER_LIMIT, OTHER_LIMIT, OTHER_LIMIT];
  const result = {};

  for (let i = 0; i < 4; i++) {
    const id = quizIds[i];
    const quiz = quizMap[id];
    const pool = questionResults[i].data ?? [];
    const shuffled = shuffle(pool);
    const served = shuffled.slice(0, limits[i]);

    // Inline passage data onto each question
    const withPassages = served.map((q) => ({
      ...q,
      passage: q.passage_id ? (passageMap[q.passage_id] ?? null) : null,
    }));

    result[keys[i]] = {
      quizId: id,
      subject: quiz?.jamb_subject ?? "",
      year: quiz?.jamb_year ?? null,
      questions: withPassages,
    };
  }

  res.json(result);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/jamb/attempts
// Submit a completed JAMB exam attempt.
// Body: { englishQuizId, subject2QuizId, subject3QuizId, subject4QuizId,
//         timeTakenSeconds, subjects: { english, subject2, subject3, subject4 } }
// Each subject object: { correct, total, breakdown: [...per_question] }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/attempts", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const {
    englishQuizId,
    subject2QuizId,
    subject3QuizId,
    subject4QuizId,
    timeTakenSeconds,
    subjects,
  } = req.body;

  if (
    !englishQuizId ||
    !subject2QuizId ||
    !subject3QuizId ||
    !subject4QuizId ||
    timeTakenSeconds == null ||
    !subjects
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Score each subject: (correct / total) * 100, rounded, capped at 100
  function subjectScore(s) {
    if (!s || !s.total) return 0;
    return Math.min(100, Math.round((s.correct / s.total) * 100));
  }

  const englishScore = subjectScore(subjects.english);
  const subject2Score = subjectScore(subjects.subject2);
  const subject3Score = subjectScore(subjects.subject3);
  const subject4Score = subjectScore(subjects.subject4);
  const totalScore =
    englishScore + subject2Score + subject3Score + subject4Score;

  const clampedTime = Math.min(
    MAX_DURATION_SECONDS,
    Math.max(0, Math.round(timeTakenSeconds)),
  );

  const { data, error } = await supabaseAdmin
    .from("jamb_exam_attempts")
    .insert({
      user_id: userId,
      english_quiz_id: englishQuizId,
      subject2_quiz_id: subject2QuizId,
      subject3_quiz_id: subject3QuizId,
      subject4_quiz_id: subject4QuizId,
      total_score: totalScore,
      english_score: englishScore,
      subject2_score: subject2Score,
      subject3_score: subject3Score,
      subject4_score: subject4Score,
      time_taken_seconds: clampedTime,
      breakdown: {
        english: {
          score: englishScore,
          breakdown: subjects.english?.breakdown ?? [],
        },
        subject2: {
          score: subject2Score,
          breakdown: subjects.subject2?.breakdown ?? [],
        },
        subject3: {
          score: subject3Score,
          breakdown: subjects.subject3?.breakdown ?? [],
        },
        subject4: {
          score: subject4Score,
          breakdown: subjects.subject4?.breakdown ?? [],
        },
      },
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ ...data, totalScore });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/jamb/leaderboard?scope=weekly|alltime
// Global JAMB leaderboard — scores over 400.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/leaderboard", async (req, res) => {
  const scope = req.query.scope === "alltime" ? "alltime" : "weekly";
  const { weekStart, weekEnd } = currentWeekWindow();

  let query = supabaseAdmin
    .from("jamb_exam_attempts")
    .select(
      "user_id, total_score, time_taken_seconds, created_at, profiles(full_name)",
    )
    .order("total_score", { ascending: false })
    .order("time_taken_seconds", { ascending: true });

  if (scope === "weekly") {
    query = query
      .gte("created_at", weekStart.toISOString())
      .lt("created_at", weekEnd.toISOString());
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Best attempt per user
  const bestByUser = new Map();
  for (const row of data ?? []) {
    if (!bestByUser.has(row.user_id)) bestByUser.set(row.user_id, row);
  }

  const entries = Array.from(bestByUser.values()).sort(
    (a, b) =>
      b.total_score - a.total_score ||
      a.time_taken_seconds - b.time_taken_seconds,
  );

  res.json({
    scope,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    entries,
  });
});

export default router;
