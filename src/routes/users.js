import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";

const router = Router();

// GET /api/users - paginated user list with attempt + unlock counts
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const search = (req.query.search || "").trim();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, is_admin, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: profiles, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  if (!profiles?.length) {
    return res.json({ users: [], total: count || 0, page, limit });
  }

  const ids = profiles.map((p) => p.id);

  // Per-user attempt count and best score
  const [{ data: attempts }, { data: unlocks }] = await Promise.all([
    supabaseAdmin.from("attempts").select("user_id, score").in("user_id", ids),
    supabaseAdmin.from("unlocked_quizzes").select("user_id").in("user_id", ids),
  ]);

  const attemptsByUser = {};
  const bestScoreByUser = {};
  for (const a of attempts || []) {
    attemptsByUser[a.user_id] = (attemptsByUser[a.user_id] || 0) + 1;
    if (!bestScoreByUser[a.user_id] || a.score > bestScoreByUser[a.user_id]) {
      bestScoreByUser[a.user_id] = a.score;
    }
  }
  const unlocksByUser = {};
  for (const u of unlocks || []) {
    unlocksByUser[u.user_id] = (unlocksByUser[u.user_id] || 0) + 1;
  }

  const users = profiles.map((p) => ({
    ...p,
    attempt_count: attemptsByUser[p.id] || 0,
    best_score: bestScoreByUser[p.id] ?? null,
    unlocked_quizzes: unlocksByUser[p.id] || 0,
  }));

  res.json({ users, total: count || 0, page, limit });
});

export default router;
