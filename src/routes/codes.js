import { Router } from 'express'
import { customAlphabet } from 'nanoid'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'

const router = Router()

const generateSuffix = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)

function generateCode() {
  return `ACE-${generateSuffix()}`
}

// GET /api/quizzes/:quizId/codes - list all codes for a quiz (admin only)
router.get('/quizzes/:quizId/codes', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('codes')
    .select('*, used_by:profiles(full_name, email)')
    .eq('quiz_id', req.params.quizId)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/quizzes/:quizId/codes/generate - generate a batch of codes (admin only)
router.post('/quizzes/:quizId/codes/generate', requireAuth, requireAdmin, async (req, res) => {
  const { quantity } = req.body
  const qty = Number(quantity)

  if (!qty || qty < 1 || qty > 1000) {
    return res.status(400).json({ error: 'Quantity must be between 1 and 1000' })
  }

  const rows = Array.from({ length: qty }, () => ({
    quiz_id: req.params.quizId,
    code: generateCode(),
    status: 'unused',
  }))

  const { data, error } = await supabaseAdmin.from('codes').insert(rows).select()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ generated: data.length, codes: data })
})

// PATCH /api/codes/:id/revoke - revoke an unused code (admin only)
router.patch('/codes/:id/revoke', requireAuth, requireAdmin, async (req, res) => {
  const { data: code, error: fetchError } = await supabaseAdmin
    .from('codes')
    .select('status')
    .eq('id', req.params.id)
    .single()

  if (fetchError) return res.status(404).json({ error: 'Code not found' })
  if (code.status !== 'unused') {
    return res.status(400).json({ error: 'Only unused codes can be revoked' })
  }

  const { data, error } = await supabaseAdmin
    .from('codes')
    .update({ status: 'revoked' })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/quizzes/:quizId/redeem - student redeems a code to unlock a quiz
router.post('/quizzes/:quizId/redeem', requireAuth, async (req, res) => {
  const { code } = req.body
  const quizId = req.params.quizId
  const userId = req.user.id

  if (!code) return res.status(400).json({ error: 'Code is required' })

  const { data: codeRow, error: codeError } = await supabaseAdmin
    .from('codes')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('code', code.trim().toUpperCase())
    .single()

  if (codeError || !codeRow) {
    return res.status(404).json({ error: 'Invalid code for this quiz' })
  }
  if (codeRow.status !== 'unused') {
    return res.status(400).json({ error: 'This code has already been used or revoked' })
  }

  // Mark code as used
  const { error: updateError } = await supabaseAdmin
    .from('codes')
    .update({ status: 'used', used_by: userId, used_at: new Date().toISOString() })
    .eq('id', codeRow.id)

  if (updateError) return res.status(500).json({ error: updateError.message })

  // Unlock the quiz for this student
  const { error: unlockError } = await supabaseAdmin
    .from('unlocked_quizzes')
    .insert({ user_id: userId, quiz_id: quizId, code_id: codeRow.id })

  if (unlockError) {
    // Likely already unlocked (unique constraint) — not a failure case
    if (!unlockError.message.includes('duplicate')) {
      return res.status(500).json({ error: unlockError.message })
    }
  }

  res.json({ success: true, message: 'Quiz unlocked' })
})

export default router
