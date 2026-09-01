import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";

const router = Router();

const ALLOWED_BUCKETS = ["ad-images", "question-images", "option-images"];
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB after compression (base64 adds ~33%)

// POST /api/upload/:bucket
// Body: { base64: string, contentType: string, fileName: string }
// Returns: { url: string }
router.post("/:bucket", requireAuth, requireAdmin, async (req, res) => {
  const { bucket } = req.params;
  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return res.status(400).json({ error: `Unknown bucket: ${bucket}` });
  }

  const { base64, contentType, fileName } = req.body;
  if (!base64 || !contentType || !fileName) {
    return res
      .status(400)
      .json({ error: "Missing base64, contentType, or fileName" });
  }

  // Strip optional data-URL prefix (data:image/webp;base64,...)
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;

  let buffer;
  try {
    buffer = Buffer.from(raw, "base64");
  } catch {
    return res.status(400).json({ error: "Invalid base64 data" });
  }

  if (buffer.byteLength > MAX_BYTES) {
    return res.status(413).json({
      error: `File too large after encoding (${Math.round(buffer.byteLength / 1024)} KB). Max ${MAX_BYTES / 1024} KB.`,
    });
  }

  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${fileName}`;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: false });

  if (error) return res.status(500).json({ error: error.message });

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  res.status(201).json({ url: data.publicUrl });
});

export default router;
