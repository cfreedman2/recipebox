import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import { isGeminiConfigured, getGeminiConfigError, getCandidateModels } from './gemini.js'
import { parseTextRecipes, parseImageRecipes } from './parseRecipes.js'
import { requireUserWhenCloud, isSupabaseAdminConfigured } from './supabaseAdmin.js'
import { createCheckoutSession, handleStripeWebhook, isBillingEnabled } from './billing.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())

// Stripe webhooks are signature-verified against the RAW body, so this route
// must be registered before the JSON body parser.
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook)

app.use(express.json({ limit: '50mb' }))

app.get('/api/health', (_req, res) => {
  const gemini = isGeminiConfigured()
  res.json({
    ok: true,
    gemini,
    geminiError: gemini ? null : getGeminiConfigError(),
    models: gemini ? getCandidateModels() : null,
    mode: gemini ? 'gemini' : 'local',
    authRequired: isSupabaseAdminConfigured(),
    billingEnabled: isBillingEnabled(),
  })
})

app.get('/api/billing/config', (_req, res) => {
  res.json({ billingEnabled: isBillingEnabled() })
})

app.post('/api/billing/create-checkout-session', createCheckoutSession)

app.post('/api/parse-recipes', requireUserWhenCloud(), async (req, res) => {
  try {
    const { type, text, images, extraCategories = [] } = req.body ?? {}

    if (!isGeminiConfigured()) {
      return res.status(400).json({
        error:
          getGeminiConfigError() ??
          'AI parsing needs GEMINI_API_KEY in .env. Pasted text still works via the local parser.',
      })
    }

    if (type === 'text') {
      if (!text?.trim()) {
        return res.status(400).json({ error: 'Text is required' })
      }
      const recipes = await parseTextRecipes({ text, extraCategories })
      return res.json({ recipes, mode: 'gemini' })
    }

    if (type === 'images') {
      if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'At least one image is required' })
      }
      const result = await parseImageRecipes({ images, text: text ?? '', extraCategories })
      return res.json({ ...result, mode: 'gemini' })
    }

    return res.status(400).json({ error: 'Invalid type. Use "text" or "images".' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message ?? 'Failed to parse recipes' })
  }
})

// Serve the built frontend in production (npm run build && npm start)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

const server = app.listen(PORT, () => {
  console.log(`API server http://localhost:${PORT}`)
  console.log(
    isGeminiConfigured()
      ? `Recipe parsing: Gemini (${getCandidateModels().join(' → ')})`
      : 'Recipe parsing: local text parser only (add GEMINI_API_KEY for AI text + photo parsing)',
  )
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other API server or change PORT in .env`)
    process.exit(1)
  }
  throw err
})
