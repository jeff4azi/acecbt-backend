import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js'

const router = Router()

// GET /api/dashboard - admin overview stats
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const [
    { count: totalUsers },
    { count: totalQuizzes },
    { count: totalCodes },
    { count: usedCodes },
    { data: attempts },
    { data: quizzes },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('quizzes').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('codes').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('codes').select('id', { count: 'exact', head: true }).eq('status', 'used'),
    supabaseAdmin.from('attempts').select('quiz_id, created_at').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('quizzes').select('id, title, price'),
  ])

  // Estimated revenue = price * used codes, per quiz
  const { data: usedCodesByQuiz } = await supabaseAdmin
    .from('codes')
    .select('quiz_id')
    .eq('status', 'used')

  const usedCountByQuiz = {}
  for (const row of usedCodesByQuiz || []) {
    usedCountByQuiz[row.quiz_id] = (usedCountByQuiz[row.quiz_id] || 0) + 1
  }

  let estimatedRevenue = 0
  const revenueByQuiz = (quizzes || []).map((q) => {
    const used = usedCountByQuiz[q.id] || 0
    const revenue = used * Number(q.price)
    estimatedRevenue += revenue
    return { quiz_id: q.id, title: q.title, used_codes: used, revenue }
  })

  // Most attempted quiz
  const attemptCounts = {}
  for (const a of attempts || []) {
    attemptCounts[a.quiz_id] = (attemptCounts[a.quiz_id] || 0) + 1
  }
  const mostAttemptedQuizId = Object.entries(attemptCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const mostAttemptedQuiz = quizzes?.find((q) => q.id === mostAttemptedQuizId) || null

  res.json({
    total_users: totalUsers || 0,
    total_quizzes: totalQuizzes || 0,
    total_codes: totalCodes || 0,
    used_codes: usedCodes || 0,
    unused_codes: (totalCodes || 0) - (usedCodes || 0),
    estimated_revenue: estimatedRevenue,
    revenue_by_quiz: revenueByQuiz,
    most_attempted_quiz: mostAttemptedQuiz,
    recent_attempts: attempts || [],
  })
})

export default router
