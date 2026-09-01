import { supabaseAdmin } from "../lib/supabaseAdmin.js";

/**
 * Verifies the Supabase JWT sent as: Authorization: Bearer <token>
 * Attaches the resolved user to req.user.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = data.user;
  next();
}

/**
 * Restricts a route to users whose profiles.is_admin = true.
 * Must run after requireAuth (relies on req.user being set).
 */
export async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", req.user.id)
    .single();

  if (error || !profile?.is_admin) {
    return res.status(403).json({ error: "Admin access only" });
  }

  next();
}
