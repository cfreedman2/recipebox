import { requireSupabase } from './supabase'
import { isSupabaseConfigured } from './env'
import { getCurrentUserId } from './user'
import { getDemoRecipes } from './demoPreview'
import {
  loadLocalRecipes,
  appendLocalRecipes,
  saveLocalRecipes,
  updateLocalRecipe,
} from './localRecipes'
import { withDishImageFields } from './recipeImageCleanup'
import { formatParsedRecipe } from './recipeFormat'

/**
 * @typedef {{ quantity: string, unit: string, name: string }} IngredientLine
 * @typedef {object} ParsedRecipe
 * @property {string} title
 * @property {string} category
 * @property {string} [subtitle]
 * @property {string} [optional]
 * @property {string} [servings]
 * @property {IngredientLine[]} ingredients
 * @property {string[]} steps
 * @property {string} [imageSrc]
 * @property {string} [imageKind] - 'dish' when imageSrc is a food photo
 * @property {string} [photoBatchKey] - links recipe to stored upload batch for re-OCR
 * @property {boolean} [titleFromPhoto] - title must stay verbatim from the card
 * @typedef {object} RecipeRecord
 * @property {string} id
 * @property {string} user_id
 * @property {string} title
 * @property {string} category
 * @property {string} [subtitle]
 * @property {string} [optional]
 * @property {string} [servings]
 * @property {IngredientLine[]} ingredients
 * @property {string[]} steps
 * @property {string} [imageSrc]
 * @property {string} [imageKind]
 * @property {string} [photoBatchKey]
 * @property {boolean} [titleFromPhoto]
 * @property {number[]} [hiddenPages]
 * @property {string} [instructions] - legacy
 * @property {string} created_at
 */

/**
 * @param {ParsedRecipe} parsed
 * @returns {Omit<RecipeRecord, 'id' | 'user_id' | 'created_at'>}
 */
export function toRecipePayload(parsed) {
  const withFields = withDishImageFields(parsed)
  const formatted = formatParsedRecipe(withFields, {
    fromImage: Boolean(withFields.titleFromPhoto || withFields.photoBatchKey),
  })
  return {
    title: formatted.title,
    category: formatted.category,
    subtitle: formatted.subtitle ?? '',
    optional: formatted.optional ?? '',
    servings: formatted.servings ?? '',
    ingredients: formatted.ingredients ?? [],
    steps: formatted.steps ?? [],
    imageSrc: formatted.imageSrc ?? '',
    imageKind: formatted.imageKind ?? '',
    photoBatchKey: formatted.photoBatchKey ?? '',
    titleFromPhoto: Boolean(formatted.titleFromPhoto || formatted.photoBatchKey),
    instructions: (formatted.steps ?? []).join('\n'),
  }
}

export async function fetchRecipes() {
  if (!isSupabaseConfigured()) {
    const stored = loadLocalRecipes()
    if (stored.length > 0) return stored
    const demo = getDemoRecipes()
    saveLocalRecipes(demo)
    return demo
  }

  const userId = await getCurrentUserId()
  const { data, error } = await (await requireSupabase())
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return /** @type {RecipeRecord[]} */ (data ?? [])
}

/**
 * @param {ParsedRecipe[]} parsed
 */
export async function insertRecipes(parsed) {
  const payloads = parsed.map(toRecipePayload)

  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString()
    const saved = payloads.map((r, i) => ({
      id: `local-${Date.now()}-${i}`,
      user_id: 'local-user',
      created_at: now,
      ...r,
    }))
    appendLocalRecipes(saved)
    return saved
  }

  const userId = await getCurrentUserId()
  const rows = payloads.map((r) => ({ user_id: userId, ...r }))

  const { data, error } = await (await requireSupabase())
    .from('recipes')
    .insert(rows)
    .select('*')
  if (error) throw error
  return /** @type {RecipeRecord[]} */ (data ?? [])
}

/**
 * @param {import('./recipes').RecipeRecord} updated
 * @returns {Promise<import('./recipes').RecipeRecord>}
 */
export async function updateRecipe(updated) {
  if (!isSupabaseConfigured()) {
    return updateLocalRecipe(updated)
  }

  const userId = await getCurrentUserId()
  const payload = toRecipePayload(updated)
  const { data, error } = await (await requireSupabase())
    .from('recipes')
    .update({ ...payload, hiddenPages: updated.hiddenPages ?? [] })
    .eq('id', updated.id)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) throw error
  return /** @type {import('./recipes').RecipeRecord} */ ({
    ...data,
    ...updated,
    ...payload,
  })
}

export async function deleteRecipe(recipeId) {
  if (!isSupabaseConfigured()) {
    const next = loadLocalRecipes().filter((r) => r.id !== recipeId)
    saveLocalRecipes(next)
    return
  }
  const { error } = await (await requireSupabase())
    .from('recipes')
    .delete()
    .eq('id', recipeId)
  if (error) throw error
}

export async function collectCategoriesFromRecipes(recipes) {
  return [...new Set(recipes.map((r) => r.category).filter(Boolean))]
}
