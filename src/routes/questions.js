import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";
import {
  deleteStorageFiles,
  deleteQuestionImages,
} from "../lib/storageCleanup.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// PASSAGE ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/quizzes/:quizId/passages — list all passages for a quiz (admin)
router.get("/quizzes/:quizId/passages", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("passages")
    .select("*")
    .eq("quiz_id", req.params.quizId)
    .order("order_index", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// POST /api/quizzes/:quizId/passages — create a passage (admin only)
router.post(
  "/quizzes/:quizId/passages",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { title, body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: "Passage body is required" });
    }

    // Set order_index = current count so new passages go to the end
    const { count } = await supabaseAdmin
      .from("passages")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", req.params.quizId);

    const { data, error } = await supabaseAdmin
      .from("passages")
      .insert({
        quiz_id: req.params.quizId,
        title: title?.trim() || null,
        body: body.trim(),
        order_index: count ?? 0,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  },
);

// PATCH /api/passages/:id — edit a passage (admin only)
router.patch("/passages/:id", requireAuth, requireAdmin, async (req, res) => {
  const { title, body } = req.body;
  if (body !== undefined && !body.trim()) {
    return res.status(400).json({ error: "Passage body cannot be empty" });
  }

  const updates = {};
  if (title !== undefined) updates.title = title?.trim() || null;
  if (body !== undefined) updates.body = body.trim();

  const { data, error } = await supabaseAdmin
    .from("passages")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/passages/:id — delete a passage (admin only)
// Questions linked to this passage will have passage_id set to NULL (on delete set null).
router.delete("/passages/:id", requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin
    .from("passages")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/quizzes/:quizId/questions — list ALL questions for a quiz (admin)
// Returns the full pool in stable order_index order — used by the admin QuizForm.
router.get("/quizzes/:quizId/questions", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("questions")
    .select("*")
    .eq("quiz_id", req.params.quizId)
    .order("order_index", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── Fisher-Yates in-place shuffle ───────────────────────────────────────────
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// GET /api/quizzes/:quizId/attempt-questions
// Student-facing endpoint. Returns a randomly selected & shuffled subset,
// with each question's passage body inlined so the client has everything it needs.
router.get(
  "/quizzes/:quizId/attempt-questions",
  requireAuth,
  async (req, res) => {
    const { quizId } = req.params;

    const [quizRes, questionsRes, passagesRes] = await Promise.all([
      supabaseAdmin
        .from("quizzes")
        .select("id, question_limit")
        .eq("id", quizId)
        .single(),
      supabaseAdmin
        .from("questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: true }),
      supabaseAdmin
        .from("passages")
        .select("id, title, body")
        .eq("quiz_id", quizId),
    ]);

    if (quizRes.error || !quizRes.data) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    if (questionsRes.error) {
      return res.status(500).json({ error: questionsRes.error.message });
    }

    // Build a passage map for O(1) lookup
    const passageMap = {};
    for (const p of passagesRes.data ?? []) {
      passageMap[p.id] = { title: p.title, body: p.body };
    }

    const pool = questionsRes.data ?? [];
    const limit = quizRes.data.question_limit;

    const shuffled = shuffle([...pool]);
    const served =
      limit != null &&
      Number.isInteger(limit) &&
      limit > 0 &&
      limit < shuffled.length
        ? shuffled.slice(0, limit)
        : shuffled;

    // Inline passage data onto each question so the client doesn't need a
    // separate fetch, but only expose title + body (not the full passage row).
    const withPassages = served.map((q) => ({
      ...q,
      passage: q.passage_id ? (passageMap[q.passage_id] ?? null) : null,
    }));

    res.json(withPassages);
  },
);

// POST /api/quizzes/:quizId/questions — add a single question (admin only)
router.post(
  "/quizzes/:quizId/questions",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const {
      question_text,
      question_image_url,
      options,
      correct_option_index,
      explanation,
      passage_id,
    } = req.body;

    if (
      !question_text ||
      !Array.isArray(options) ||
      options.length < 2 ||
      correct_option_index == null
    ) {
      return res
        .status(400)
        .json({ error: "Missing or invalid question fields" });
    }

    const { count } = await supabaseAdmin
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", req.params.quizId);

    const { data, error } = await supabaseAdmin
      .from("questions")
      .insert({
        quiz_id: req.params.quizId,
        question_text,
        question_image_url: question_image_url || null,
        options,
        correct_option_index,
        explanation: explanation || null,
        passage_id: passage_id || null,
        order_index: count || 0,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  },
);

// POST /api/quizzes/:quizId/questions/import — bulk import from JSON (admin only)
// Supports an optional top-level "passages" array plus per-question "passage_ref"
// (a passage title or 1-based index) that links questions to a passage.
//
// Full format with passages:
// {
//   "passages": [
//     { "title": "Passage 1", "body": "Once upon a time…" }
//   ],
//   "questions": [
//     { ..., "passage_ref": "Passage 1" }   // link by title
//     { ..., "passage_ref": 1 }              // or by 1-based index
//   ]
// }
router.post(
  "/quizzes/:quizId/questions/import",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { questions, passages } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res
        .status(400)
        .json({ error: 'Expected a non-empty "questions" array' });
    }

    // ── Insert passages first so we get their IDs ──────────────────────────
    const passageIdMap = {}; // key → uuid   (key = title or "1"-based index string)

    if (Array.isArray(passages) && passages.length > 0) {
      // Get current passage count so order_index continues from the end
      const { count: existingPassageCount } = await supabaseAdmin
        .from("passages")
        .select("id", { count: "exact", head: true })
        .eq("quiz_id", req.params.quizId);

      const passageRows = passages
        .filter((p) => p?.body?.trim())
        .map((p, i) => ({
          quiz_id: req.params.quizId,
          title: p.title?.trim() || null,
          body: p.body.trim(),
          order_index: (existingPassageCount ?? 0) + i,
        }));

      if (passageRows.length > 0) {
        const { data: insertedPassages, error: pErr } = await supabaseAdmin
          .from("passages")
          .insert(passageRows)
          .select();

        if (pErr) return res.status(500).json({ error: pErr.message });

        // Build lookup: title → id, and "1"-based-index string → id
        insertedPassages.forEach((p, i) => {
          passageIdMap[String(i + 1)] = p.id;
          if (p.title) passageIdMap[p.title] = p.id;
        });
      }
    }

    // ── Resolve existing passages for this quiz so refs work on re-import ──
    const { data: existingPassages } = await supabaseAdmin
      .from("passages")
      .select("id, title")
      .eq("quiz_id", req.params.quizId);

    for (const p of existingPassages ?? []) {
      if (p.title && !passageIdMap[p.title]) {
        passageIdMap[p.title] = p.id;
      }
    }

    // ── Build question rows ────────────────────────────────────────────────
    const { count } = await supabaseAdmin
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", req.params.quizId);

    let startIndex = count || 0;

    const rows = questions.map((q, i) => {
      // Resolve passage_ref → UUID
      let passageId = null;
      if (q.passage_ref !== undefined && q.passage_ref !== null) {
        const refKey = String(q.passage_ref);
        passageId = passageIdMap[refKey] ?? null;
      }

      return {
        quiz_id: req.params.quizId,
        question_text: q.question_text,
        question_image_url: q.question_image || null,
        options: (q.options || []).map((opt) => ({
          text: opt.text,
          image_url: opt.image || null,
        })),
        correct_option_index: q.correct_option,
        explanation: q.explanation || null,
        passage_id: passageId,
        order_index: startIndex + i,
      };
    });

    const invalid = rows.find(
      (r) =>
        !r.question_text ||
        !Array.isArray(r.options) ||
        r.options.length < 2 ||
        r.correct_option_index == null,
    );
    if (invalid) {
      return res
        .status(400)
        .json({ error: "One or more questions are missing required fields" });
    }

    const { data, error } = await supabaseAdmin
      .from("questions")
      .insert(rows)
      .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ imported: data.length, questions: data });
  },
);

// PATCH /api/questions/:id — edit a question (admin only)
router.patch("/questions/:id", requireAuth, requireAdmin, async (req, res) => {
  const { data: existing } = await supabaseAdmin
    .from("questions")
    .select("question_image_url, options")
    .eq("id", req.params.id)
    .single();

  const { data, error } = await supabaseAdmin
    .from("questions")
    .update(req.body)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (existing) {
    const staleUrls = [];
    if (
      req.body.question_image_url !== undefined &&
      existing.question_image_url &&
      existing.question_image_url !== req.body.question_image_url
    ) {
      staleUrls.push(existing.question_image_url);
    }
    if (req.body.options && Array.isArray(existing.options)) {
      existing.options.forEach((oldOpt, i) => {
        const newOpt = req.body.options[i];
        if (oldOpt?.image_url && newOpt?.image_url !== oldOpt.image_url) {
          staleUrls.push(oldOpt.image_url);
        }
      });
    }
    if (staleUrls.length) await deleteStorageFiles(staleUrls);
  }

  res.json(data);
});

// DELETE /api/questions/:id — delete a question (admin only)
router.delete("/questions/:id", requireAuth, requireAdmin, async (req, res) => {
  const { data: question } = await supabaseAdmin
    .from("questions")
    .select("question_image_url, options")
    .eq("id", req.params.id)
    .single();

  const { error } = await supabaseAdmin
    .from("questions")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  if (question) await deleteQuestionImages([question]);

  res.status(204).end();
});

export default router;
