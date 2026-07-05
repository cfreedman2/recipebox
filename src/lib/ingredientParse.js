import { formatIngredient } from './recipeTextFormat.js'

const UNIT_PATTERN =
  /^(cups?|cup|tablespoons?|tablespoon|tbsp|teaspoons?|teaspoon|tsp|ounces?|ounce|oz|pounds?|pound|lbs?|lb|grams?|gram|g|kilograms?|kg|milliliters?|ml|liters?|l|cloves?|clove|bunch|bunches|pinch|pinches|dash|dashes|can|cans|package|packages|pkg|slice|slices|head|heads|stalk|stalks|sprigs?|sprig|pieces?|piece|whole|large|medium|small)\b/i

/**
 * @typedef {{ quantity: string, unit: string, name: string }} IngredientLine
 */

/**
 * @param {string} line
 * @returns {IngredientLine}
 */
export function parseIngredientLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return { quantity: '', unit: '', name: '' }

  const paren = trimmed.match(/^([\d¼½⅓⅔⅛⅜⅝⅞./\s-]+)?\s*(\([^)]+\))\s+(.+)$/)
  if (paren) {
    return {
      quantity: (paren[1] ?? '').trim(),
      unit: paren[2].trim(),
      name: paren[3].trim(),
    }
  }

  const parts = trimmed.split(/\s+/)
  let i = 0
  const quantityParts = []

  while (i < parts.length && /^[\d¼½⅓⅔⅛⅜⅝⅞./-]+$/.test(parts[i])) {
    quantityParts.push(parts[i])
    i += 1
  }

  const quantity = quantityParts.join(' ')
  let unit = ''
  let nameStart = i

  if (i < parts.length && UNIT_PATTERN.test(parts[i])) {
    unit = parts[i]
    nameStart = i + 1
  }

  const name = parts.slice(nameStart).join(' ').trim()

  if (!quantity && !unit) {
    return { quantity: '', unit: '', name: trimmed }
  }

  return { quantity, unit, name: name || trimmed }
}

/**
 * @param {string[] | IngredientLine[]} raw
 * @param {{ format?: boolean, fromImage?: boolean }} [options]
 * @returns {IngredientLine[]}
 */
export function normalizeIngredients(raw, options = {}) {
  const shouldFormat = options.format !== false
  if (!raw?.length) return []

  /** @type {IngredientLine[]} */
  let parsed
  if (typeof raw[0] === 'object' && raw[0] !== null && 'name' in raw[0]) {
    parsed = raw.map((ing) => ({
      quantity: String(ing.quantity ?? '').trim(),
      unit: String(ing.unit ?? '').trim(),
      name: String(ing.name ?? '').trim(),
    }))
  } else {
    parsed = raw.map((line) => parseIngredientLine(String(line)))
  }

  if (!shouldFormat) return parsed
  return parsed.map((ing) => formatIngredient(ing, { fromImage: options.fromImage }))
}
