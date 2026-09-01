import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'

const router = Router()

async function attachQuizCounts(quizzes) {
  if (!quizzes?.length) return []
  const ids = quizzes.map((q) => q.id)

  const [questionRes, attemptRes] = await Promise.all([
    supabaseAdmin
      .from('questions')
      .select('quiz_id')
      .in('quiz_id', ids),
    supabaseAdmin
      .from('attempts')
      .select('quiz_id')
      .in('quiz_id', ids),
  ])

  const questionCount = {}
  for (const r of questionRes.data ?? []) {
    questionCount[r.quiz_id] = (questionCount[r.quiz_id] ?? 0) + 1
  }
  const attemptCount = {}
  for (const r of attemptRes.data ?? []) {
    attemptCount[r.quiz_id] = (attemptCount[r.quiz_id] ?? 0) + 1
  }

  return quizzes.map((q) => ({
    ...q,
    question_count: questionCount[q.id] ?? 0,
    attempt_count: attemptCount[q.id] ?? 0,
  }))
}

// GET /api/quizzes - list published quizzes (students)
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  const enriched = await attachQuizCounts(data ?? [])
  res.json(enriched)
})

// GET /api/quizzes/admin - list ALL quizzes (admin only, published + drafts)
router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  const enriched = await attachQuizCounts(data ?? [])
  res.json(enriched)
})

// GET /api/quizzes/:id - single quiz detail
router.get('/:id', async (req, res) => {
  const { data: quiz, error } = await supabaseAdmin
    .from('quizzes')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: 'Quiz not found' })

  const [questionCountRes, attemptCountRes] = await Promise.all([
    supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', req.params.id),
    supabaseAdmin
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', req.params.id),
  ])

  res.json({
    ...quiz,
    question_count: questionCountRes.count ?? 0,
    attempt_count: attemptCountRes.count ?? 0,
  })
})

// POST /api/quizzes - create quiz (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { title, description, price, duration_minutes, pass_mark } = req.body

  if (!title || price == null || !duration_minutes || pass_mark == null) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .insert({ title, description, price, duration_minutes, pass_mark })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// PATCH /api/quizzes/:id - edit quiz (admin only)
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const updates = { ...req.body, updated_at: new Date().toISOString() }

  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/quizzes/:id - delete quiz (admin only, blocked if attempts exist)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { count, error: countError } = await supabaseAdmin
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', req.params.id)

  if (countError) return res.status(500).json({ error: countError.message })

  if (count > 0) {
    return res.status(400).json({
      error: 'This quiz has attempts and cannot be deleted. Edit it instead.',
    })
  }

  const { error } = await supabaseAdmin.from('quizzes').delete().eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.status(204).end()
})

export default router
