import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'

const router = Router()

// GET /api/settings - public read (students need whatsapp/bank info on quiz page)
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('admin_settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// PATCH /api/settings - update settings (admin only)
router.patch('/', requireAuth, requireAdmin, async (req, res) => {
  const {
    whatsapp_number,
    bank_name,
    account_number,
    account_name,
    contact_email,
    contact_phone,
  } = req.body

  const { data, error } = await supabaseAdmin
    .from('admin_settings')
    .update({
      whatsapp_number,
      bank_name,
      account_number,
      account_name,
      contact_email,
      contact_phone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
