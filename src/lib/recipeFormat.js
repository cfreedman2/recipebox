import { normalizeIngredients } from './ingredientParse.js'
import { computeRecipeSpacingStyle } from './recipeSpacing.js'
import {
  normalizeRecipeSteps,
  splitInstructionsFromText,
} from './instructionSteps.js'
import {
  formatRecipeLineText,
  formatIngredientName,
  formatMeasurementUnit,
  formatInstruction,
  formatOcrTitle,
  formatOcrSubtitle,
} from './recipeTextFormat.js'

/**
 * Photo/OCR recipes keep the title exactly as read — no grammar or typo fixes.
 * @param {import('./recipes').ParsedRecipe | import('./recipes').RecipeRecord} recipe
 * @param {{ fromImage?: boolean }} [options]
 */
export function usesVerbatimTitle(recipe, options = {}) {
  return Boolean(
    options.fromImage ||
      recipe.titleFromPhoto ||
      String(recipe.photoBatchKey ?? '').trim(),
  )
}

/**
 * @param {import('./recipes').ParsedRecipe | import('./recipes').RecipeRecord} recipe
 * @param {{ fromImage?: boolean }} [options]
 */
export function formatParsedRecipe(recipe, options = {}) {
  const fromImage = Boolean(options.fromImage)
  const verbatimTitle = usesVerbatimTitle(recipe, options)
  const ingredients = formatRecipeIngredients(recipe.ingredients ?? [], fromImage)
  const steps = formatRecipeSteps(
    recipe.steps,
    recipe.instructions ?? '',
    fromImage,
  )

  return {
    ...recipe,
    title: verbatimTitle
      ? formatOcrTitle(String(recipe.title ?? '')).trim() || 'Untitled Recipe'
      : formatRecipeLineText(String(recipe.title ?? '')).trim() || 'Untitled Recipe',
    subtitle: fromImage
      ? formatOcrSubtitle(String(recipe.subtitle ?? '')).trim()
      : formatRecipeLineText(String(recipe.subtitle ?? ''), { fromImage }).trim(),
    optional: formatOptionalText(recipe.optional ?? '', fromImage),
    servings: formatRecipeLineText(String(recipe.servings ?? ''), { fromImage }).trim(),
    ingredients,
    steps,
  }
}

/** @param {string} text */
function formatOptionalText(text, fromImage = false) {
  return String(text ?? '')
    .split(/\n+/)
    .map((line) => formatRecipeLineText(line.trim(), { fromImage }))
    .filter(Boolean)
    .join('\n')
}

/**
 * @param {import('./ingredientParse.js').IngredientLine[] | string[]} raw
 * @param {boolean} fromImage
 */
function formatRecipeIngredients(raw, fromImage) {
  const parsed = normalizeIngredients(raw, { format: false })
  return parsed.map((ing) => ({
    quantity: String(ing.quantity ?? '').trim(),
    unit: formatMeasurementUnit(String(ing.unit ?? '').trim(), fromImage),
    name: formatIngredientName(String(ing.name ?? ''), {
      hasMeasurement: Boolean(ing.quantity?.trim() || ing.unit?.trim()),
      fromImage,
    }),
  }))
}

/**
 * @param {string[] | undefined} steps
 * @param {string} instructions
 * @param {boolean} fromImage
 */
function formatRecipeSteps(steps, instructions, fromImage) {
  const normalized = normalizeRecipeSteps(steps, instructions, { format: false })
  return normalized.map((step) => formatInstruction(step, { fromImage }))
}

/** @param {string} instructions */
export function splitInstructions(instructions) {
  return splitInstructionsFromText(instructions)
}

/**
 * @param {import('./recipes').RecipeRecord} record
 */
export function normalizeSteps(record) {
  return normalizeRecipeSteps(record.steps, record.instructions ?? '')
}

/**
 * @param {string} [title]
 */
export function resolveRecipeTitle(title) {
  const trimmed = title?.trim()
  return trimmed || 'Untitled Recipe'
}

/**
 * @param {import('./recipes').RecipeRecord} record
 */
export function recordToTemplateProps(record) {
  const formatted = formatParsedRecipe(record, {
    fromImage: usesVerbatimTitle(record),
  })
  const title = resolveRecipeTitle(formatted.title)
  const imageSrc = record.imageSrc?.trim() ?? ''

  const spacingStyle = computeRecipeSpacingStyle({
    title,
    subtitle: formatted.subtitle,
    optional: formatted.optional,
    ingredients: formatted.ingredients,
    steps: formatted.steps,
    servings: formatted.servings,
    hasImage: Boolean(imageSrc),
  })

  return {
    title,
    category: record.category,
    subtitle: formatted.subtitle,
    optional: formatted.optional,
    ingredients: formatted.ingredients,
    steps: formatted.steps,
    servings: formatted.servings ?? '',
    imageSrc,
    spacingStyle,
  }
}
