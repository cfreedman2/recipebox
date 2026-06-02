// Unit abbreviation map
const UNIT_ABBREVIATIONS = {
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  ounce: 'oz',
  ounces: 'oz',
  gram: 'g',
  grams: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  pound: 'lb',
  pounds: 'lb',
  lbs: 'lb',
  milliliter: 'ml',
  milliliters: 'ml',
  liter: 'l',
  liters: 'l',
}

export function formatUnit(unit) {
  if (!unit) return ''
  const lower = unit.toLowerCase().trim()
  return UNIT_ABBREVIATIONS[lower] || unit
}

// Conversion constants
const OZ_PER_GRAM = 0.035274
const G_PER_OZ = 28.3495
const LB_PER_KG = 2.20462
const KG_PER_LB = 0.453592

function parseQuantity(qty) {
  if (!qty) return null
  const str = String(qty).trim()
  // Handle fractions like ¼ ½ ¾ ⅓ ⅔
  const fractionMap = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1/3, '⅔': 2/3, '⅛': 0.125 }
  if (fractionMap[str]) return fractionMap[str]
  // Handle "1/2" style
  if (str.includes('/')) {
    const [num, den] = str.split('/')
    return parseFloat(num) / parseFloat(den)
  }
  return parseFloat(str) || null
}

function formatQuantity(num) {
  if (num === null || isNaN(num)) return ''
  // Round to 2 decimal places
  const rounded = Math.round(num * 100) / 100
  // Common fractions
  const fractions = [
    [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.5, '½'],
    [0.667, '⅔'], [0.75, '¾']
  ]
  const whole = Math.floor(rounded)
  const frac = rounded - whole
  for (const [val, sym] of fractions) {
    if (Math.abs(frac - val) < 0.05) {
      return whole > 0 ? `${whole}${sym}` : sym
    }
  }
  if (Math.abs(frac) < 0.05) return String(whole)
  return String(rounded)
}

export function convertIngredient(ingredient, targetUnit) {
  const { quantity, unit, name } = ingredient
  const abbr = formatUnit(unit)

  if (targetUnit === 'metric') {
    if (abbr === 'oz') {
      const qty = parseQuantity(quantity)
      if (qty !== null) {
        return { quantity: formatQuantity(qty * G_PER_OZ), unit: 'g', name }
      }
    }
    if (abbr === 'lb') {
      const qty = parseQuantity(quantity)
      if (qty !== null) {
        return { quantity: formatQuantity(qty * KG_PER_LB), unit: 'kg', name }
      }
    }
  }

  if (targetUnit === 'imperial') {
    if (abbr === 'g') {
      const qty = parseQuantity(quantity)
      if (qty !== null) {
        return { quantity: formatQuantity(qty * OZ_PER_GRAM), unit: 'oz', name }
      }
    }
    if (abbr === 'kg') {
      const qty = parseQuantity(quantity)
      if (qty !== null) {
        return { quantity: formatQuantity(qty * LB_PER_KG), unit: 'lb', name }
      }
    }
  }

  return { quantity, unit: abbr || unit, name }
}

export function applyUnitSystem(ingredients, system) {
  if (!ingredients) return []
  return ingredients.map(ing => convertIngredient(ing, system))
}
