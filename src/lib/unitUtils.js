/**
 * Unit abbreviation and conversion utilities.
 *
 * Volume units (cup, tbsp, tsp) are universal in cooking and stay unchanged.
 * Weight units convert between imperial (oz, lb) and metric (g, kg) based on
 * the user's chosen system.
 */

/** @typedef {'imperial' | 'metric'} UnitSystem */

const UNIT_ABBREV = {
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  ounce: 'oz',
  ounces: 'oz',
  pound: 'lb',
  pounds: 'lb',
  lbs: 'lb',
  gram: 'g',
  grams: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  cup: 'cup',
  cups: 'cup',
}

/**
 * Return the standard short abbreviation for a unit, or the original if unknown.
 * @param {string} unit
 * @returns {string}
 */
export function abbreviateUnit(unit) {
  const key = String(unit ?? '').toLowerCase().trim()
  return UNIT_ABBREV[key] ?? unit
}

/**
 * Parse a quantity string (may include fractions like "1/2", "¼", "1 1/2") into a number.
 * Returns null if unparseable.
 * @param {string} qty
 * @returns {number | null}
 */
function parseQuantity(qty) {
  const s = String(qty ?? '').trim()
  if (!s) return null

  const VULGAR = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3,
    '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 }

  let n = 0
  for (const part of s.split(/\s+/)) {
    if (VULGAR[part] !== undefined) {
      n += VULGAR[part]
      continue
    }
    if (part.includes('/')) {
      const [num, den] = part.split('/')
      const p = Number(num) / Number(den)
      if (Number.isFinite(p)) n += p
      continue
    }
    const p = Number(part)
    if (Number.isFinite(p)) n += p
  }

  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Format a number back to a tidy string:
 * - Whole numbers: "170"
 * - One decimal if non-zero: "0.9"
 * @param {number} n
 * @param {number} [decimals]
 * @returns {string}
 */
function formatNumber(n, decimals = 1) {
  const rounded = Math.round(n * 10 ** decimals) / 10 ** decimals
  return rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(decimals)
}

/**
 * Convert a single ingredient's quantity + unit to the target unit system.
 * Returns `{ quantity, unit }` — both strings.
 *
 * @param {string} quantity
 * @param {string} unit
 * @param {UnitSystem} system
 * @returns {{ quantity: string, unit: string }}
 */
export function convertIngredient(quantity, unit, system) {
  const abbr = abbreviateUnit(unit)
  const num = parseQuantity(quantity)

  if (num === null) {
    return { quantity, unit: abbr }
  }

  if (system === 'metric') {
    if (abbr === 'oz') {
      const g = num * 28.3495
      return { quantity: formatNumber(g, 0), unit: 'g' }
    }
    if (abbr === 'lb') {
      const g = num * 453.592
      // Show in kg if >= 1 kg
      if (g >= 1000) return { quantity: formatNumber(g / 1000, 2), unit: 'kg' }
      return { quantity: formatNumber(g, 0), unit: 'g' }
    }
  }

  if (system === 'imperial') {
    if (abbr === 'g') {
      const oz = num / 28.3495
      return { quantity: formatNumber(oz, 1), unit: 'oz' }
    }
    if (abbr === 'kg') {
      const lb = num * 2.20462
      return { quantity: formatNumber(lb, 1), unit: 'lb' }
    }
  }

  return { quantity, unit: abbr }
}
