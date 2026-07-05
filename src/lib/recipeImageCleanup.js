/**
 * Remove recipe-page scans mistakenly saved as card images.
 * Only images explicitly marked as dish photos are kept.
 *
 * @param {import('./recipes').RecipeRecord} record
 */
export function stripNonDishImage(record) {
  const imageSrc = record.imageSrc?.trim() ?? ''
  if (!imageSrc) {
    return { ...record, imageSrc: '', imageKind: '' }
  }
  if (record.imageKind === 'dish') {
    return record
  }
  return { ...record, imageSrc: '', imageKind: '' }
}

/**
 * @param {import('./recipes').RecipeRecord[]} recipes
 * @returns {import('./recipes').RecipeRecord[]}
 */
export function cleanupRecipeImages(recipes) {
  return recipes.map(stripNonDishImage)
}

/**
 * @param {import('./recipes').ParsedRecipe | import('./recipes').RecipeRecord} recipe
 */
export function withDishImageFields(recipe) {
  const imageSrc = recipe.imageSrc?.trim() ?? ''
  return {
    ...recipe,
    imageSrc,
    imageKind: imageSrc ? 'dish' : '',
  }
}
