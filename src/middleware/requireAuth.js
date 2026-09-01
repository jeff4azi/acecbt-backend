import { supabaseAdmin } from "../lib/supabaseAdmin.js";

/**
 * Verifies the Supabase JWT sent as: Authorization: Bearer <token>
 * Attaches:
 *   req.user     = raw Supabase auth user
 *   req.profile  = row from profiles (id, full_name, email, is_admin) — never null for valid tokens
 *   req.isAdmin  = boolean shortcut for req.profile.is_admin === true
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({
      error: "Missing auth token",
      code: "MISSING_TOKEN",
    });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    const errorName = error?.name || "";
    const code =
      errorName.includes("JWT") || errorName === "AuthSessionMissingError"
        ? "TOKEN_EXPIRED"
        : errorName.includes("Invalid")
          ? "INVALID_TOKEN"
          : "TOKEN_REJECTED";
    return res.status(401).json({
      error: error?.message || "Invalid or expired token",
      code,
    });
  }

  const user = data.user;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  // If no profile row exists yet (e.g. just-created user), build a minimal one
  // — for admin users the create-admins script already upserted a row with is_admin=true
  const safeProfile = profileError || !profile
    ? {
        id: user.id,
        full_name: user.user_metadata?.full_name ?? null,
        email: user.email ?? null,
        is_admin: false,
      }
    : profile;

  req.user = user;
  req.profile = safeProfile;
  req.isAdmin = safeProfile.is_admin === true;
  next();
}

/**
 * Restricts a route to users whose profiles.is_admin = true.
 * Must run after requireAuth (relies on req.isAdmin / req.profile being set).
 */
export async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res
      .status(401)
      .json({ error: "Not authenticated", code: "NOT_AUTHENTICATED" });
  }

  if (!req.isAdmin) {
    return res
      .status(403)
      .json({ error: "Admin access only", code: "ADMIN_REQUIRED" });
  }

  next();
}
