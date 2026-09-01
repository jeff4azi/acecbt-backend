import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

// GET /api/unlocked - list quiz_ids the current student has unlocked
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('unlocked_quizzes')
    .select('quiz_id, unlocked_at')
    .eq('user_id', req.user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/unlocked/:quizId - check if a specific quiz is unlocked for the current student
router.get('/:quizId', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('unlocked_quizzes')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('quiz_id', req.params.quizId)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ unlocked: !!data })
})

export default router
