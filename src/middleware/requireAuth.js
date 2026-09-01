import { supabaseAdmin } from '../lib/supabaseAdmin.js'

/**
 * Verifies the Supabase access token sent from the client as:
 *   Authorization: Bearer <token>
 * Attaches the resolved user to req.user.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' })
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = data.user
  next()
}

/**
 * Restricts a route to the single admin account.
 * Must run after requireAuth. Matches by email against ADMIN_EMAIL env var.
 */
export function requireAdmin(req, res, next) {
  const adminEmail = process.env.ADMIN_EMAIL

  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  if (!adminEmail || req.user.email !== adminEmail) {
    return res.status(403).json({ error: 'Admin access only' })
  }

  next()
}
