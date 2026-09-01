import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    'Supabase env vars are missing on the server. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to server/.env'
  )
}

// Service-role client — bypasses RLS. Only ever used server-side, never exposed to the client.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
