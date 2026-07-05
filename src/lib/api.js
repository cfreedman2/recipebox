import { fileToVisionApiDataUrl } from './imageUtils'
import { getAccessToken } from './auth'

/** JSON headers plus the Supabase session token when signed in. */
async function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = await getAccessToken().catch(() => null)
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export async function fetchParseHealth() {
  const res = await fetch('/api/health')
  if (!res.ok) throw new Error('API unavailable')
  return res.json()
}

/**
 * @param {{ type: 'text', text: string, extraCategories?: string[] }} payload
 * @returns {Promise<object[]>}
 */
export async function parseRecipes(payload) {
  const res = await fetch('/api/parse-recipes', {
    method: 'POST',
    headers: await buildHeaders(),
    body: JSON.stringify(payload),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  return body.recipes
}

/**
 * @param {File[]} files
 * @param {string[]} extraCategories
 * @returns {Promise<{ recipes: object[], recipeImageMatches: (number | null)[], imageRoles: string[], foodImageRegions: ({ x:number, y:number, width:number, height:number } | null)[] }>}
 */
export async function parseRecipeImages(files, extraCategories = []) {
  const images = await Promise.all(
    files.map(async (file) => {
      const dataUrl = await fileToVisionApiDataUrl(file, 3200)
      const [header, data] = dataUrl.split(',')
      const mediaMatch = header.match(/data:([^;]+)/)
      return {
        media_type: mediaMatch?.[1] || file.type || 'image/jpeg',
        data,
      }
    }),
  )

  const res = await fetch('/api/parse-recipes', {
    method: 'POST',
    headers: await buildHeaders(),
    body: JSON.stringify({ type: 'images', images, extraCategories }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }

  return {
    recipes: body.recipes ?? [],
    recipeImageMatches: Array.isArray(body.recipeImageMatches)
      ? body.recipeImageMatches.map((v) =>
          v === null || v === undefined || v === '' ? null : Number(v),
        )
      : [],
    imageRoles: Array.isArray(body.imageRoles) ? body.imageRoles : [],
    foodImageRegions: Array.isArray(body.foodImageRegions)
      ? body.foodImageRegions.map((r) => {
          if (!r || typeof r !== 'object') return null
          const region = {
            x: Number(r.x),
            y: Number(r.y),
            width: Number(r.width),
            height: Number(r.height),
          }
          return Object.values(region).some((v) => Number.isNaN(v)) ? null : region
        })
      : [],
  }
}
