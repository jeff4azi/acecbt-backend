import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// POST /api/quizzes/:quizId/attempts - submit a completed attempt
router.post("/quizzes/:quizId/attempts", requireAuth, async (req, res) => {
  const quizId = req.params.quizId;
  const userId = req.user.id;
  const { correct_count, wrong_count, total_questions, time_taken_seconds } =
    req.body;

  if (
    correct_count == null ||
    wrong_count == null ||
    !total_questions ||
    time_taken_seconds == null
  ) {
    return res.status(400).json({ error: "Missing required attempt fields" });
  }

  // Confirm the student has unlocked this quiz before accepting an attempt
  const { data: unlocked } = await supabaseAdmin
    .from("unlocked_quizzes")
    .select("id")
    .eq("user_id", userId)
    .eq("quiz_id", quizId)
    .maybeSingle();

  if (!unlocked) {
    return res.status(403).json({ error: "Quiz not unlocked for this user" });
  }

  const score = Math.round((correct_count / total_questions) * 100);

  const { data, error } = await supabaseAdmin
    .from("attempts")
    .insert({
      user_id: userId,
      quiz_id: quizId,
      score,
      correct_count,
      wrong_count,
      total_questions,
      time_taken_seconds,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Include pass/fail relative to the quiz's pass mark
  const { data: quiz } = await supabaseAdmin
    .from("quizzes")
    .select("pass_mark")
    .eq("id", quizId)
    .single();

  res
    .status(201)
    .json({ ...data, passed: quiz ? score >= quiz.pass_mark : null });
});

// GET /api/history - current student's attempt history (lean, with pass/fail)
router.get("/history", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("attempts")
    .select("*, quiz:quizzes(id, title, pass_mark)")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const withPassFail = data.map((a) => ({
    ...a,
    passed: a.quiz ? a.score >= a.quiz.pass_mark : null,
  }));

  res.json(withPassFail);
});

// GET /api/quizzes/:quizId/leaderboard?scope=weekly|alltime
// Default scope is "weekly". All-time returns the same shape but without date filtering.
router.get("/quizzes/:quizId/leaderboard", async (req, res) => {
  const scope = req.query.scope === "alltime" ? "alltime" : "weekly";

  // ── Compute current week window (Monday 00:00:00 UTC → Sunday 23:59:59 UTC) ──
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sun, 1 = Mon … 6 = Sat
  const daysFromMonday = (dayOfWeek + 6) % 7; // Mon=0, Tue=1, … Sun=6

  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysFromMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7); // exclusive upper bound (next Monday 00:00)

  let query = supabaseAdmin
    .from("attempts")
    .select(
      "user_id, score, time_taken_seconds, created_at, profiles(full_name)",
    )
    .eq("quiz_id", req.params.quizId)
    .order("score", { ascending: false })
    .order("time_taken_seconds", { ascending: true });

  if (scope === "weekly") {
    query = query
      .gte("created_at", weekStart.toISOString())
      .lt("created_at", weekEnd.toISOString());
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Reduce to each user's single best attempt (first occurrence after sort)
  const bestByUser = new Map();
  for (const row of data) {
    if (!bestByUser.has(row.user_id)) {
      bestByUser.set(row.user_id, row);
    }
  }

  const leaderboard = Array.from(bestByUser.values()).sort(
    (a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds,
  );

  res.json({
    scope,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(), // next Monday 00:00 UTC — use for countdown
    entries: leaderboard,
  });
});

export default router;
