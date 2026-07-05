import { GoogleGenAI, Type } from '@google/genai'

let client = null

export function isGeminiConfigured() {
  const key = process.env.GEMINI_API_KEY
  return Boolean(key?.trim()) && !key.includes('your-gemini')
}

export function getGeminiConfigError() {
  const key = process.env.GEMINI_API_KEY
  if (!key?.trim()) {
    return 'GEMINI_API_KEY is missing from .env — get one at aistudio.google.com/apikey'
  }
  if (key.includes('your-gemini')) {
    return 'GEMINI_API_KEY is still the placeholder — paste your real key from Google AI Studio'
  }
  return null
}

function getClient() {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  }
  return client
}

/** Ordered candidate models — first success wins; env override goes first. */
export function getCandidateModels() {
  const preferred = process.env.GEMINI_MODEL?.trim()
  const defaults = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash']
  return preferred ? [preferred, ...defaults.filter((m) => m !== preferred)] : defaults
}

/**
 * Model fallback + exponential-backoff retry on transient errors (503/429).
 * @param {{ contents: any, config?: any }} params
 */
export async function generateContentWithRetry(params) {
  let lastError = null

  for (const model of getCandidateModels()) {
    let attempts = 3
    let delay = 500

    while (attempts > 0) {
      try {
        return await getClient().models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        })
      } catch (error) {
        lastError = error
        const message = String(error?.message ?? '')
        const status = error?.status ?? error?.statusCode ?? null
        const transient =
          status === 503 ||
          status === 429 ||
          message.includes('503') ||
          message.includes('429') ||
          message.includes('UNAVAILABLE') ||
          message.includes('high demand')

        console.warn(`[gemini] ${model} failed (${status ?? 'n/a'}): ${message.slice(0, 200)}`)

        if (transient) {
          attempts -= 1
          if (attempts > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay))
            delay *= 2
            continue
          }
        }
        break // non-transient (e.g. unknown model) — try next candidate
      }
    }
  }

  throw lastError ?? new Error('All Gemini model candidates failed.')
}

/** Structured-output schema for extracted recipes (heirloom app schema). */
export const RECIPE_RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      subtitle: { type: Type.STRING },
      notes: { type: Type.STRING },
      category: { type: Type.STRING },
      ingredients: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            quantity: { type: Type.STRING },
            unit: { type: Type.STRING },
            name: { type: Type.STRING },
          },
          required: ['quantity', 'unit', 'name'],
        },
      },
      instructions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      servings: { type: Type.STRING },
      foodBoundingBox: {
        type: Type.ARRAY,
        items: { type: Type.NUMBER },
      },
    },
    required: ['title', 'ingredients', 'instructions'],
  },
}
