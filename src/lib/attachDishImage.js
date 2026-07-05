import { withDishImageFields } from './recipeImageCleanup'

/**
 * @param {import('./recipes').ParsedRecipe[]} recipes
 * @param {string} imageSrc
 */
export function attachDishImage(recipes, imageSrc) {
  const src = imageSrc?.trim() ?? ''
  return recipes.map((r) => withDishImageFields({ ...r, imageSrc: src }))
}
