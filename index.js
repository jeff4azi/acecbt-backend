import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import quizzesRouter from './src/routes/quizzes.js'
import questionsRouter from './src/routes/questions.js'
import codesRouter from './src/routes/codes.js'
import attemptsRouter from './src/routes/attempts.js'
import adsRouter from './src/routes/ads.js'
import settingsRouter from './src/routes/settings.js'
import dashboardRouter from './src/routes/dashboard.js'
import unlockedRouter from './src/routes/unlocked.js'

dotenv.config()

const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  'https://cbt.aceeduc.com',
]

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
  preflightContinue: false,
}

app.use(cors(corsOptions))

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ace-edu-cbt-api' })
})

app.use('/api/quizzes', quizzesRouter)
app.use('/api', questionsRouter) // includes /quizzes/:quizId/questions*
app.use('/api', codesRouter) // includes /quizzes/:quizId/codes*, /codes/:id/revoke, /quizzes/:quizId/redeem
app.use('/api', attemptsRouter) // includes /quizzes/:quizId/attempts, /history, /quizzes/:quizId/leaderboard
app.use('/api/ads', adsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/unlocked', unlockedRouter)

// 404 fallback for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

const PORT = process.env.PORT || 5000

// Vercel serverless wraps this export; app.listen only runs in local dev
if (process.env.NODE_ENV !== 'production' || process.env.LOCAL_DEV) {
  app.listen(PORT, () => {
    console.log(`Ace Edu CBT API running on http://localhost:${PORT}`)
  })
}

export default app
