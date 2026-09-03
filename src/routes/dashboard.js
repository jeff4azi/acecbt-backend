import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";

const router = Router();

// GET /api/dashboard - admin overview stats
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    { count: totalUsers },
    { count: totalQuizzes },
    { count: totalCodes },
    { count: usedCodes },
    { count: newUsers },
    { count: totalAttempts },
    { data: recentAttemptsRaw },
    { data: quizzes },
    { data: allAttemptScores },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("quizzes").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("codes").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("codes")
      .select("id", { count: "exact", head: true })
      .eq("status", "used"),
    supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    supabaseAdmin.from("attempts").select("id", { count: "exact", head: true }),
    // Recent attempts with profile + quiz info
    supabaseAdmin
      .from("attempts")
      .select(
        "id, score, correct_count, total_questions, created_at, user_id, quiz_id, profiles(full_name), quizzes(title)",
      )
      .order("created_at", { ascending: false })
      .limit(8),
    supabaseAdmin.from("quizzes").select("id, title, price, pass_mark"),
    // All scores for avg + pass rate calculation (just score + pass_mark via quiz)
    supabaseAdmin.from("attempts").select("score, quiz_id"),
  ]);

  // ── Revenue by quiz ───────────────────────────────────────────────────────
  const { data: usedCodesByQuiz } = await supabaseAdmin
    .from("codes")
    .select("quiz_id")
    .eq("status", "used");

  const usedCountByQuiz = {};
  for (const row of usedCodesByQuiz || []) {
    usedCountByQuiz[row.quiz_id] = (usedCountByQuiz[row.quiz_id] || 0) + 1;
  }

  let estimatedRevenue = 0;
  const revenueByQuiz = (quizzes || [])
    .map((q) => {
      const used = usedCountByQuiz[q.id] || 0;
      const revenue = used * Number(q.price);
      estimatedRevenue += revenue;
      return { quiz_id: q.id, title: q.title, used_codes: used, revenue };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // ── Most attempted quiz ───────────────────────────────────────────────────
  const attemptCountByQuiz = {};
  for (const a of allAttemptScores || []) {
    attemptCountByQuiz[a.quiz_id] = (attemptCountByQuiz[a.quiz_id] || 0) + 1;
  }
  const mostAttemptedQuizId = Object.entries(attemptCountByQuiz).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  const mostAttemptedQuiz =
    quizzes?.find((q) => q.id === mostAttemptedQuizId) || null;
  const mostAttemptedCount = mostAttemptedQuizId
    ? attemptCountByQuiz[mostAttemptedQuizId] || 0
    : 0;

  // ── Average score + pass rate ─────────────────────────────────────────────
  const passMaskByQuiz = {};
  for (const q of quizzes || []) passMaskByQuiz[q.id] = q.pass_mark;

  let totalScore = 0;
  let passCount = 0;
  const scores = allAttemptScores || [];
  for (const a of scores) {
    totalScore += a.score;
    const pm = passMaskByQuiz[a.quiz_id] ?? 50;
    if (a.score >= pm) passCount++;
  }
  const avgScore =
    scores.length > 0 ? Math.round(totalScore / scores.length) : 0;
  const passRate =
    scores.length > 0 ? Math.round((passCount / scores.length) * 100) : 0;

  // ── Attempt volume last 7 days (daily breakdown) ──────────────────────────
  const { data: recentActivityRaw } = await supabaseAdmin
    .from("attempts")
    .select("created_at")
    .gte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: true });

  const dailyCounts = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyCounts[key] = 0;
  }
  for (const r of recentActivityRaw || []) {
    const key = r.created_at.slice(0, 10);
    if (key in dailyCounts) dailyCounts[key]++;
  }
  const activityLast7Days = Object.entries(dailyCounts).map(
    ([date, count]) => ({ date, count }),
  );

  // ── Top 5 quizzes by attempt count ────────────────────────────────────────
  const topQuizzes = (quizzes || [])
    .map((q) => ({ ...q, attempt_count: attemptCountByQuiz[q.id] || 0 }))
    .sort((a, b) => b.attempt_count - a.attempt_count)
    .slice(0, 5);

  res.json({
    // top-level stats
    total_users: totalUsers || 0,
    total_quizzes: totalQuizzes || 0,
    total_codes: totalCodes || 0,
    used_codes: usedCodes || 0,
    unused_codes: (totalCodes || 0) - (usedCodes || 0),
    estimated_revenue: estimatedRevenue,
    new_users_7d: newUsers || 0,
    total_attempts: totalAttempts || 0,
    avg_score: avgScore,
    pass_rate: passRate,
    // sections
    revenue_by_quiz: revenueByQuiz,
    most_attempted_quiz: mostAttemptedQuiz
      ? { ...mostAttemptedQuiz, attempt_count: mostAttemptedCount }
      : null,
    top_quizzes: topQuizzes,
    activity_last_7_days: activityLast7Days,
    recent_attempts: recentAttemptsRaw || [],
  });
});

export default router;
