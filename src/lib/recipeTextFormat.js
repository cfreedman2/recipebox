import { stripCrossedOutText } from './recipeTextCleanup.js'

/**
 * Sentence case, abbreviation expansion, and punctuation for recipe text.
 * Measurement units (tsp, tbsp, oz, etc.) stay abbreviated.
 */

/** @type {[RegExp, string][]} */
const TYPO_FIXES = [
  [/\bbutternut squah\b/gi, 'butternut squash'],
  [/\bsquah\b/gi, 'squash'],
  [/\bchiken\b/gi, 'chicken'],
  [/\btumeric\b/gi, 'turmeric'],
  [/\bcinamon\b/gi, 'cinnamon'],
  [/\bmozarella\b/gi, 'mozzarella'],
  [/\bbrocoli\b/gi, 'broccoli'],
  [/\bbrocolli\b/gi, 'broccoli'],
  [/\bzuchini\b/gi, 'zucchini'],
  [/\bavacado\b/gi, 'avocado'],
  [/\bexpresso\b/gi, 'espresso'],
  [/\bvegatable\b/gi, 'vegetable'],
  [/\bvegtables\b/gi, 'vegetables'],
  [/\breciepe\b/gi, 'recipe'],
  [/\breciept\b/gi, 'recipe'],
  [/\breceipe\b/gi, 'recipe'],
  [/\bingredeince\b/gi, 'ingredient'],
  [/\bingrediants\b/gi, 'ingredients'],
  [/\btomatos\b/gi, 'tomatoes'],
  [/\bpotatos\b/gi, 'potatoes'],
  [/\bseperate\b/gi, 'separate'],
  [/\bseperated\b/gi, 'separated'],
  [/\buntill\b/gi, 'until'],
  [/\bdefinately\b/gi, 'definitely'],
  [/\boccassion\b/gi, 'occasion'],
  [/\boccured\b/gi, 'occurred'],
  [/\bvinigar\b/gi, 'vinegar'],
  [/\bbalsmic\b/gi, 'balsamic'],
  [/\bparcely\b/gi, 'parsley'],
  [/\bcinammon\b/gi, 'cinnamon'],
  [/\blemonn\b/gi, 'lemon'],
  [/\bonionn\b/gi, 'onion'],
]

/** @type {[RegExp, string][]} */
const TEXT_EXPANSIONS = [
  [/\bs\s*&\s*p\b/gi, 'salt and pepper'],
  [/\bw\/\b/gi, 'with'],
  [/\bapprox\.?\b/gi, 'approximately'],
  [/\be\.g\.\b/gi, 'for example'],
  [/\bi\.e\.\b/gi, 'that is'],
  [/\betc\.?\b/gi, 'etcetera'],
  [/\b(\d+)\s*hrs?\.\b/gi, '$1 hours'],
  [/\b(\d+)\s*hrs?\b/gi, '$1 hours'],
  [/\b(\d+)\s*mins?\.\b/gi, '$1 minutes'],
  [/\b(\d+)\s*mins?\b/gi, '$1 minutes'],
  [/\b(\d+)\s*secs?\.\b/gi, '$1 seconds'],
  [/\b(\d+)\s*secs?\b/gi, '$1 seconds'],
  [/\bno\.\s*/gi, 'number '],
  [/\s&\s/g, ' and '],
]

const MEASUREMENT_TOKEN =
  /^(?:tsp|tsps|teaspoons?|tbsp|tbsps|tablespoons?|cups?|cup|oz|ounces?|lbs?|pounds?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|cloves?|clove|pinches?|pinch|dashes?|dash|cans?|can|packages?|package|pkgs?|pkg|slices?|slice|heads?|head|stalks?|stalk|sprigs?|sprig|pieces?|piece|bunches?|bunch|large|medium|small|whole)$/i

/** @type {[RegExp, string][]} */
const PROPER_NOUNS = [
  [/\bidaho\b/g, 'Idaho'],
  [/\bbrussels\b/g, 'Brussels'],
  [/\benglish\b/g, 'English'],
  [/\bfrench\b/g, 'French'],
  [/\bitalian\b/g, 'Italian'],
  [/\bspanish\b/g, 'Spanish'],
  [/\bmexican\b/g, 'Mexican'],
  [/\basian\b/g, 'Asian'],
  [/\bgreek\b/g, 'Greek'],
  [/\bamerican\b/g, 'American'],
  [/\bcanadian\b/g, 'Canadian'],
  [/\bkosher\b/g, 'Kosher'],
  [/\bdijon\b/g, 'Dijon'],
  [/\bworcestershire\b/g, 'Worcestershire'],
  [/\bsriracha\b/g, 'Sriracha'],
  [/\bparmesan\b/g, 'Parmesan'],
  [/\bromano\b/g, 'Romano'],
  [/\bgruyere\b/g, 'Gruyere'],
  [/\bcheddar\b/g, 'Cheddar'],
  [/\bbrie\b/g, 'Brie'],
  [/\bfeta\b/g, 'Feta'],
]

/**
 * @param {string} text
 */
export function fixRecipeGrammar(text) {
  let result = String(text ?? '')
  result = result.replace(/\band and\b/gi, 'and')
  result = result.replace(/\bthe the\b/gi, 'the')
  result = result.replace(/\bto to\b/gi, 'to')
  result = result.replace(/\s+,/g, ',')
  result = result.replace(/\.{2,}/g, '.')
  result = result.replace(/\?{2,}/g, '?')
  result = result.replace(/!{2,}/g, '!')
  return result
}

/**
 * @param {string} text
 */
export function fixRecipeTypos(text) {
  let result = String(text ?? '')
  for (const [pattern, replacement] of TYPO_FIXES) {
    result = result.replace(pattern, replacement)
  }
  return result
}

/**
 * @param {string} text
 * @param {{ fromImage?: boolean }} [options]
 */
export function hasUncertaintyMarker(text) {
  return /\[\?\]|\?(?=\s|$|[^\d])/.test(String(text ?? ''))
}

/**
 * @param {string} text
 * @param {{ fromImage?: boolean }} [options]
 */
export function polishRecipeText(text, options = {}) {
  let result = String(text ?? '').trim()
  if (!result) return ''
  if (!options.fromImage) {
    result = fixRecipeTypos(result)
  }
  result = fixRecipeGrammar(result)
  result = expandTextAbbreviations(result)
  return result.replace(/\s{2,}/g, ' ').trim()
}

/**
 * @param {string} text
 */
export function expandTextAbbreviations(text) {
  let result = String(text ?? '').trim()
  if (!result) return ''

  for (const [pattern, replacement] of TEXT_EXPANSIONS) {
    result = result.replace(pattern, replacement)
  }

  return result.replace(/\s{2,}/g, ' ').trim()
}

/**
 * @param {string} text
 */
export function normalizePunctuation(text) {
  let result = String(text ?? '').trim()
  if (!result) return ''

  result = result.replace(/\s+([,.;:!?])/g, '$1')
  result = result.replace(/,([^\s])/g, ', $1')
  result = result.replace(/;([^\s])/g, '; $1')
  result = result.replace(/\s{2,}/g, ' ')

  return result.trim()
}

/**
 * @param {string} text
 */
export function toSentenceCase(text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return ''

  const lower = trimmed.toLowerCase()
  let result = lower.charAt(0).toUpperCase() + lower.slice(1)
  result = result.replace(/([.!?]\s+)([a-z])/g, (_, punct, letter) => `${punct}${letter.toUpperCase()}`)
  result = result.replace(/(?:^|\n+)([a-z])/g, (match, letter, offset) =>
    offset === 0 ? match : letter.toUpperCase(),
  )
  result = result.replace(/\bi\b/g, 'I')

  return result
}

/**
 * @param {string} text
 * @param {{ fromImage?: boolean }} [options]
 */
export function formatRecipeLineText(text, options = {}) {
  const polished = polishRecipeText(text, options)
  if (!polished) return ''
  if (options.fromImage && hasUncertaintyMarker(polished)) {
    return normalizePunctuation(polished)
  }
  return toSentenceCase(normalizePunctuation(polished))
}

/**
 * Preserve printed title from OCR — no typo correction or case rewriting.
 * @param {string} text
 */
export function formatOcrTitle(text) {
  const trimmed = stripCrossedOutText(String(text ?? '')).trim()
  if (!trimmed) return ''
  return normalizePunctuation(trimmed)
}

/**
 * @param {string} text
 */
export function formatOcrSubtitle(text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return ''
  const polished = polishRecipeText(trimmed, { fromImage: true })
  if (!polished) return ''
  if (hasUncertaintyMarker(polished)) return normalizePunctuation(polished)
  return toSentenceCase(normalizePunctuation(polished))
}

/**
 * @param {string} text
 */
export function ensureInstructionPunctuation(text, options = {}) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return ''
  if (options.fromImage && hasUncertaintyMarker(trimmed)) return trimmed
  if (/[.!?]$/.test(trimmed)) return trimmed
  return `${trimmed}.`
}

/**
 * @param {string} text
 */
export function toLowercaseWithProperNouns(text) {
  let result = String(text ?? '').trim().toLowerCase()
  if (!result) return ''
  for (const [pattern, replacement] of PROPER_NOUNS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

/**
 * @param {string} name
 * @param {{ hasMeasurement?: boolean, fromImage?: boolean }} [options]
 */
export function formatIngredientName(name, options = {}) {
  const hasMeasurement = Boolean(options.hasMeasurement)
  const raw = stripCrossedOutText(String(name ?? '')).trim()
  if (!raw) return ''

  if (options.fromImage) {
    let polished = normalizePunctuation(fixRecipeGrammar(expandTextAbbreviations(raw)))
    if (hasUncertaintyMarker(polished)) {
      return hasMeasurement ? polished.toLowerCase() : polished
    }
    return hasMeasurement ? toLowercaseWithProperNouns(polished) : polished
  }

  const polished = normalizePunctuation(polishRecipeText(raw, options))
  if (!polished) return ''
  if (hasMeasurement) return toLowercaseWithProperNouns(polished)
  return toSentenceCase(polished)
}

/**
 * @param {string} unit
 * @param {boolean} [fromImage]
 */
export function formatMeasurementUnit(unit, fromImage = false) {
  const trimmed = String(unit ?? '').trim()
  if (!trimmed) return ''
  if (fromImage && hasUncertaintyMarker(trimmed)) return trimmed
  return trimmed.toLowerCase()
}

/**
 * @param {import('./ingredientParse.js').IngredientLine} ing
 */
export function formatIngredient(ing, options = {}) {
  const quantity = String(ing.quantity ?? '').trim()
  const hasMeasurement = Boolean(quantity || ing.unit?.trim())
  const unit = formatMeasurementUnit(String(ing.unit ?? '').trim(), options.fromImage)
  const name = formatIngredientName(String(ing.name ?? ''), {
    hasMeasurement,
    fromImage: options.fromImage,
  })

  return { quantity, unit, name }
}

/**
 * @param {string} step
 * @param {{ fromImage?: boolean }} [options]
 */
export function formatInstruction(step, options = {}) {
  let text = stripCrossedOutText(String(step ?? '')).trim()
  if (!text) return ''

  text = text.replace(/^\s*(?:step\s*)?\d+[\).\]:]\s*/i, '')

  if (options.fromImage) {
    return normalizePunctuation(text)
  }

  text = formatRecipeLineText(text, options)
  text = ensureInstructionPunctuation(text, options)

  return text
}

/**
 * @param {import('./ingredientParse.js').IngredientLine[]} ingredients
 */
export function formatIngredients(ingredients) {
  return (ingredients ?? []).map(formatIngredient)
}

/**
 * @param {string[]} steps
 */
export function formatInstructions(steps) {
  return (steps ?? []).map(formatInstruction).filter(Boolean)
}
