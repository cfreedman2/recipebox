import { parseRecipeImages, fetchParseHealth } from './api'
import { convertApiRecipes } from './convertApiRecipe'
import { createRecipeCardImageDataUrl } from './imageUtils'
import { withDishImageFields } from './recipeImageCleanup'
import { RECIPE_IMAGE_ASPECT } from './recipeImageConstants'

const PHOTO_PARSE_CACHE_KEY = 'recipe-box-photo-parse-cache-v19'
const MAX_PARSE_CACHE_ITEMS = 30

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // If local storage is full, skip cache writes.
  }
}

/** @param {File[]} files @param {string[]} extraCategories */
function buildBatchKey(files, extraCategories) {
  const fileSig = files
    .map((f) => `${f.name}|${f.size}|${f.lastModified}|${f.type}`)
    .join('::')
  const cats = [...new Set(extraCategories.map((c) => c.trim().toLowerCase()))]
    .sort()
    .join('|')
  return `${fileSig}##${cats}`
}

function setParseCacheEntry(batchKey, payload) {
  const cache = loadJson(PHOTO_PARSE_CACHE_KEY, {})
  cache[batchKey] = { ...payload, updatedAt: Date.now() }
  const entries = Object.entries(cache).sort(
    (a, b) => (b[1]?.updatedAt ?? 0) - (a[1]?.updatedAt ?? 0),
  )
  saveJson(PHOTO_PARSE_CACHE_KEY, Object.fromEntries(entries.slice(0, MAX_PARSE_CACHE_ITEMS)))
}

/**
 * Read uploaded images with Gemini: extracts every recipe, detects embedded
 * food-photo regions (cropped to the 3:1 card banner client-side, so the
 * photo stays authentic), and matches standalone dish photos to recipes.
 *
 * @param {File[]} files — one or more images (recipe pages and/or dish photos)
 * @param {string[]} extraCategories
 * @param {(message: string) => void} [onProgress]
 * @returns {Promise<{ recipes: import('./recipes').ParsedRecipe[], mode: 'vision', imageRoles: string[], uncertainMarkers: number }>}
 */
export async function parseRecipePhotos(files, extraCategories = [], onProgress) {
  if (!files.length) {
    throw new Error('Choose at least one image.')
  }

  const batchKey = buildBatchKey(files, extraCategories)

  onProgress?.(
    files.length > 1
      ? `Reading ${files.length} images (recipe pages + dish photos)…`
      : 'Reading recipe from photo with AI…',
  )

  const cached = loadJson(PHOTO_PARSE_CACHE_KEY, {})[batchKey]
  let parsed
  if (cached?.recipes?.length) {
    onProgress?.('Using saved parsing result (no additional AI credits)…')
    parsed = cached
  } else {
    let health
    try {
      health = await fetchParseHealth()
    } catch {
      throw new Error('Photo reading requires the API server. Stop the app and run: npm run dev')
    }
    if (!health.gemini) {
      throw new Error(
        health.geminiError ??
          'Add a valid GEMINI_API_KEY to .env (see .env.example), then restart with npm run dev.',
      )
    }

    parsed = await parseRecipeImages(files, extraCategories)
    if (parsed.recipes.length) {
      setParseCacheEntry(batchKey, parsed)
    }
  }

  const baseRecipes = convertApiRecipes(parsed.recipes, { fromImage: true })
  if (!baseRecipes.length) {
    throw new Error(
      'Could not read a recipe from these photos. Try clearer photos or paste the recipe text instead.',
    )
  }

  const matches = parsed.recipeImageMatches ?? []
  const regions = parsed.foodImageRegions ?? []
  const imageRoles = parsed.imageRoles ?? []

  if (matches.some((m) => m != null)) {
    onProgress?.('Cropping dish photo to the 3:1 card banner…')
  }

  const finalRecipes = await Promise.all(
    baseRecipes.map(async (recipe, i) => {
      const withBatch = { ...recipe, photoBatchKey: batchKey, titleFromPhoto: true }
      const imageIndex = matches[i]
      if (imageIndex == null || !files[imageIndex]) {
        return withDishImageFields({ ...withBatch, imageSrc: '' })
      }

      const imageSrc = await createRecipeCardImageDataUrl(files[imageIndex], {
        region: regions[i] ?? null,
        isDedicatedFoodPhoto: imageRoles[imageIndex] === 'food_photo',
        focalX: 0.5,
        focalY: 0.5,
        targetAspect: RECIPE_IMAGE_ASPECT,
        maxWidth: 1800,
      })

      return withDishImageFields({ ...withBatch, imageSrc })
    }),
  )

  return {
    recipes: finalRecipes,
    mode: 'vision',
    imageRoles,
    uncertainMarkers: 0,
  }
}

/**
 * @returns {Promise<{ ready: boolean, message: string }>}
 */
export async function getPhotoUploadStatus() {
  try {
    const health = await fetchParseHealth()
    if (!health.gemini) {
      return {
        ready: false,
        message: health.geminiError ?? 'Add GEMINI_API_KEY to .env and restart npm run dev.',
      }
    }
    return {
      ready: true,
      message:
        'Photo reading uses Gemini with the recipe extraction prompt (edit server/recipeExtractionPrompt.js to change extraction behavior).',
    }
  } catch {
    return {
      ready: false,
      message: 'API server is not running. Use npm run dev (starts web + API together).',
    }
  }
}
