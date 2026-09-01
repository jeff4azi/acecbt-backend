import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";
import { deleteStorageFile } from "../lib/storageCleanup.js";

const router = Router();

// GET /api/ads - list active ads (public, used by home page to pick one at random client-side)
router.get("/", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("ads")
    .select("*")
    .eq("is_active", true);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/ads/admin - list ALL ads (admin only)
router.get("/admin", requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("ads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/ads - create an ad (admin only)
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { image_url, link_url, duration_seconds } = req.body;

  if (!image_url || !link_url || !duration_seconds) {
    return res.status(400).json({ error: "Missing required ad fields" });
  }

  const { data, error } = await supabaseAdmin
    .from("ads")
    .insert({ image_url, link_url, duration_seconds })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/ads/:id - edit/toggle an ad (admin only)
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  // Fetch current row so we can delete a replaced image from storage
  const { data: existing } = await supabaseAdmin
    .from("ads")
    .select("image_url")
    .eq("id", req.params.id)
    .single();

  const { data, error } = await supabaseAdmin
    .from("ads")
    .update(req.body)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Delete old image if it was replaced with a new one
  if (
    existing?.image_url &&
    req.body.image_url !== undefined &&
    req.body.image_url !== existing.image_url
  ) {
    await deleteStorageFile(existing.image_url);
  }

  res.json(data);
});

// DELETE /api/ads/:id - delete an ad (admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  // Fetch before delete so we have the image URL
  const { data: existing } = await supabaseAdmin
    .from("ads")
    .select("image_url")
    .eq("id", req.params.id)
    .single();

  const { error } = await supabaseAdmin
    .from("ads")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });

  // Clean up storage after successful DB delete
  if (existing?.image_url) await deleteStorageFile(existing.image_url);

  res.status(204).end();
});

export default router;
