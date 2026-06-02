import express from 'express'
import cors from 'cors'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))

const upload = multer({ dest: 'uploads/' })

const CATEGORIES = ['Poultry', 'Beef', 'Lamb', 'Fish', 'Salads', 'Soups', 'Desserts', 'Pasta', 'Sides', 'Breakfast']

const RECIPE_JSON_SCHEMA = `{
  "recipes": [
    {
      "title": "Recipe Name",
      "subtitle": "A short appetizing description",
      "category": "one of: Poultry, Beef, Lamb, Fish, Salads, Soups, Desserts, Pasta, Sides, Breakfast",
      "ingredients": [{ "quantity": "¼", "unit": "cup", "name": "olive oil" }],
      "instructions_raw": "1. Preheat oven...\\n2. Mix...",
      "servings": "4 servings"
    }
  ]
}`

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  try {
    const { default: Anthropic } = require('@anthropic-ai/sdk')
    return new Anthropic({ apiKey })
  } catch {
    return null
  }
}

async function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    return new Anthropic({ apiKey })
  } catch {
    return null
  }
}

app.post('/api/parse-recipes', upload.array('images'), async (req, res) => {
  try {
    const anthropic = await getAnthropic()

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      if (!anthropic) {
        // Clean up uploaded files
        req.files.forEach(f => fs.unlink(f.path, () => {}))
        return res.status(400).json({ error: 'ANTHROPIC_API_KEY not configured' })
      }

      const imageMessages = []
      for (const file of req.files) {
        const imageData = fs.readFileSync(file.path)
        const base64 = imageData.toString('base64')
        const mediaType = file.mimetype || 'image/jpeg'
        imageMessages.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 }
        })
        fs.unlink(file.path, () => {})
      }

      imageMessages.push({
        type: 'text',
        text: `You are given one or more images. Each image is either a recipe page or a dish photo.

For each recipe page, extract the complete recipe. For dish photos, associate them with the nearest recipe.

Return a JSON object matching this schema exactly:
${RECIPE_JSON_SCHEMA}

Instructions:
- category must be one of: ${CATEGORIES.join(', ')}
- ingredients must be an array of objects with quantity, unit, name
- instructions_raw should be numbered steps separated by newlines
- If an image is a dish photo (not a recipe), note it but don't create a recipe for it
- Return ONLY valid JSON, no markdown, no explanation`
      })

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: imageMessages }]
      })

      const text = response.content[0].text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return res.status(500).json({ error: 'Could not parse AI response' })
      }
      const parsed = JSON.parse(jsonMatch[0])
      return res.json(parsed)
    }

    // Handle text input
    const { text } = req.body
    if (!text) {
      return res.status(400).json({ error: 'No text or images provided' })
    }

    if (!anthropic) {
      // Fall back to local parser
      const { localParseRecipes } = await import('./localParser.js').catch(() => ({ localParseRecipes: null }))
      if (localParseRecipes) {
        return res.json(localParseRecipes(text))
      }
      // Minimal local parse
      return res.json({
        recipes: [{
          title: 'Imported Recipe',
          subtitle: '',
          category: 'Sides',
          ingredients: [],
          instructions_raw: text,
          servings: ''
        }]
      })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Parse the following recipe text and return a JSON object matching this schema exactly:
${RECIPE_JSON_SCHEMA}

Rules:
- category must be one of: ${CATEGORIES.join(', ')}
- ingredients must be an array of objects with quantity (string), unit (string), name (string)
- instructions_raw should be numbered steps like "1. Step one\\n2. Step two"
- Extract servings if mentioned
- If multiple recipes are present, return all of them
- Return ONLY valid JSON, no markdown, no explanation

Recipe text:
${text}`
      }]
    })

    const responseText = response.content[0].text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse AI response' })
    }
    const parsed = JSON.parse(jsonMatch[0])
    return res.json(parsed)

  } catch (err) {
    console.error('Error in /api/parse-recipes:', err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
