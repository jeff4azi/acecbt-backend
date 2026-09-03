import express from "express";
import dotenv from "dotenv";
import { requireAuth } from "./src/middleware/requireAuth.js";

import quizzesRouter from "./src/routes/quizzes.js";
import questionsRouter from "./src/routes/questions.js";
import codesRouter from "./src/routes/codes.js";
import attemptsRouter from "./src/routes/attempts.js";
import adsRouter from "./src/routes/ads.js";
import settingsRouter from "./src/routes/settings.js";
import dashboardRouter from "./src/routes/dashboard.js";
import unlockedRouter from "./src/routes/unlocked.js";
import uploadRouter from "./src/routes/upload.js";
import usersRouter from "./src/routes/users.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "https://cbt.aceeduc.com",
  "https://backend.aceeduc.com",
  "http://backend.aceeduc.com",
];

const ALLOWED_METHODS = "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS";
const ALLOWED_HEADERS =
  "Content-Type,Authorization,Accept,Origin,X-Requested-With";

const isOriginAllowed = (origin) => !origin || allowedOrigins.includes(origin);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (isOriginAllowed(origin)) {
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
    res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  if (req.method === "OPTIONS") {
    if (!isOriginAllowed(origin)) {
      return res.status(403).json({ error: "Origin not allowed by CORS" });
    }
    return res.status(200).end();
  }

  next();
});

app.use(express.json({ limit: "4mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "ace-edu-cbt-api" });
});

// GET /api/me — authenticated caller's user + profile info
app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.profile.email ?? req.user.email ?? null,
    full_name:
      req.profile.full_name ?? req.user.user_metadata?.full_name ?? null,
    is_admin: req.isAdmin,
    profile: req.profile,
    auth_user: {
      id: req.user.id,
      email: req.user.email,
      created_at: req.user.created_at,
    },
  });
});

// PATCH /api/me — update the authenticated user's own profile (name only)
app.patch("/api/me", requireAuth, async (req, res) => {
  const { full_name } = req.body;
  if (!full_name || typeof full_name !== "string" || !full_name.trim()) {
    return res.status(400).json({ error: "full_name is required" });
  }
  const trimmed = full_name.trim();

  const { supabaseAdmin } = await import("./src/lib/supabaseAdmin.js");

  // Update profiles table
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ full_name: trimmed })
    .eq("id", req.user.id)
    .select("id, full_name, email, is_admin")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Also keep auth.users metadata in sync so user_metadata.full_name stays accurate
  await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
    user_metadata: { full_name: trimmed },
  });

  res.json(data);
});

app.use("/api/quizzes", quizzesRouter);
app.use("/api", questionsRouter); // includes /quizzes/:quizId/questions*
app.use("/api", codesRouter); // includes /quizzes/:quizId/codes*, /codes/:id/revoke, /quizzes/:quizId/redeem
app.use("/api", attemptsRouter); // includes /quizzes/:quizId/attempts, /history, /quizzes/:quizId/leaderboard
app.use("/api/ads", adsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/unlocked", unlockedRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/users", usersRouter);

// 404 fallback for unmatched API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

const PORT = process.env.PORT || 5000;

// Vercel serverless wraps this export; app.listen only runs in local dev
if (process.env.NODE_ENV !== "production" || process.env.LOCAL_DEV) {
  app.listen(PORT, () => {
    console.log(`Ace Edu CBT API running on http://localhost:${PORT}`);
  });
}

export default app;
