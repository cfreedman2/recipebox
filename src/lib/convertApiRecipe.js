import { formatParsedRecipe } from './recipeFormat'

/**
 * @param {object} r — recipe from /api/parse-recipes
 * @param {{ fromImage?: boolean }} [options]
 * @returns {import('./recipes').ParsedRecipe}
 */
export function convertApiRecipe(r, options = {}) {
  return formatParsedRecipe(
    {
      title: String(r.title ?? '').trim(),
      category: String(r.category ?? 'Sides').trim() || 'Sides',
      subtitle: String(r.subtitle ?? '').trim(),
      optional: String(r.optional ?? '').trim(),
      servings: String(r.servings ?? '').trim(),
      ingredients: r.ingredients ?? [],
      steps: Array.isArray(r.steps) ? r.steps.map((s) => String(s).trim()).filter(Boolean) : r?.steps,
      instructions: String(r.instructions_raw ?? r.instructions ?? ''),
    },
    options,
  )
}

/**
 * @param {object[]} apiRecipes
 * @param {{ fromImage?: boolean }} [options]
 * @returns {import('./recipes').ParsedRecipe[]}
 */
export function convertApiRecipes(apiRecipes, options = {}) {
  return apiRecipes.map((r) => convertApiRecipe(r, options))
}
