import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";
import {
  deleteStorageFiles,
  deleteQuestionImages,
} from "../lib/storageCleanup.js";

const router = Router();

// GET /api/quizzes/:quizId/questions - list questions for a quiz
router.get("/quizzes/:quizId/questions", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("questions")
    .select("*")
    .eq("quiz_id", req.params.quizId)
    .order("order_index", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/quizzes/:quizId/questions - add a single question (admin only)
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
        order_index: count || 0,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  },
);

// POST /api/quizzes/:quizId/questions/import - bulk import from JSON (admin only)
router.post(
  "/quizzes/:quizId/questions/import",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res
        .status(400)
        .json({ error: 'Expected a non-empty "questions" array' });
    }

    const { count } = await supabaseAdmin
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", req.params.quizId);

    let startIndex = count || 0;

    const rows = questions.map((q, i) => ({
      quiz_id: req.params.quizId,
      question_text: q.question_text,
      question_image_url: q.question_image || null,
      options: (q.options || []).map((opt) => ({
        text: opt.text,
        image_url: opt.image || null,
      })),
      correct_option_index: q.correct_option,
      explanation: q.explanation || null,
      order_index: startIndex + i,
    }));

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

// PATCH /api/questions/:id - edit a question (admin only)
router.patch("/questions/:id", requireAuth, requireAdmin, async (req, res) => {
  // Fetch current row so we can delete replaced images from storage
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

  // Delete old images that were replaced
  if (existing) {
    const staleUrls = [];

    // Question image replaced?
    if (
      req.body.question_image_url !== undefined &&
      existing.question_image_url &&
      existing.question_image_url !== req.body.question_image_url
    ) {
      staleUrls.push(existing.question_image_url);
    }

    // Option images replaced?
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

// DELETE /api/questions/:id - delete a question (admin only)
router.delete("/questions/:id", requireAuth, requireAdmin, async (req, res) => {
  // Fetch before delete so we have the image URLs
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

  // Clean up storage after successful DB delete
  if (question) await deleteQuestionImages([question]);

  res.status(204).end();
});

export default router;
