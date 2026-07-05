import { expandInstructionSteps, isInstructionSectionHeader } from './instructionSteps.js'

/**
 * Flat content blocks for recipe page pagination.
 * @typedef {'title' | 'title-continued' | 'ingredient' | 'step' | 'optional' | 'servings' | 'image'} RecipeBlockType
 * @typedef {{
 *   type: RecipeBlockType,
 *   key: string,
 *   ingredient?: { quantity: string, unit?: string, name: string },
 *   step?: { index: number, text: string, isHeader?: boolean },
 *   optionalText?: string,
 * }} RecipeBlock
 */

/** * @param {object} recipe
 * @param {string} recipe.title
 * @param {string} [recipe.subtitle]
 * @param {{ quantity: string, unit?: string, name: string }[]} [recipe.ingredients]
 * @param {string[]} [recipe.steps]
 * @param {string} [recipe.optional]
 * @param {string} [recipe.servings]
 * @param {boolean} [recipe.hasPhoto]
 * @returns {RecipeBlock[]}
 */
export function buildRecipeBlocks({
  title,
  subtitle = '',
  ingredients = [],
  steps = [],
  optional = '',
  servings = '',
  hasPhoto = false,
}) {
  /** @type {RecipeBlock[]} */
  const blocks = [
    { type: 'title', key: 'title', title, subtitle },
  ]

  for (let i = 0; i < ingredients.length; i++) {
    blocks.push({
      type: 'ingredient',
      key: `ing-${i}`,
      ingredient: ingredients[i],
    })
  }

  for (const stepText of expandInstructionSteps(steps)) {
    const i = blocks.filter((b) => b.type === 'step').length
    if (isInstructionSectionHeader(stepText)) {
      blocks.push({
        type: 'step',
        key: `step-${i}`,
        step: { index: 0, text: stepText, isHeader: true },
      })
      continue
    }

    const numberedIndex =
      blocks.filter((b) => b.type === 'step' && !b.step?.isHeader).length + 1
    blocks.push({
      type: 'step',
      key: `step-${i}`,
      step: { index: numberedIndex, text: stepText, isHeader: false },
    })
  }
  const optionalParagraphs = optional
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  for (let i = 0; i < optionalParagraphs.length; i++) {
    blocks.push({
      type: 'optional',
      key: `opt-${i}`,
      optionalText: optionalParagraphs[i],
    })
  }

  if (servings?.trim()) {
    blocks.push({ type: 'servings', key: 'servings', servings })
  }

  if (hasPhoto) {
    blocks.push({ type: 'image', key: 'image' })
  }

  return blocks
}

/** @param {RecipeBlock} block */
export function blockSection(block) {
  switch (block.type) {
    case 'title':
    case 'title-continued':
      return 'title'
    case 'ingredient':
      return 'ingredients'
    case 'step':
      return 'steps'
    case 'optional':
      return 'optional'
    case 'servings':
      return 'servings'
    case 'image':
      return 'image'
    default:
      return 'other'
  }
}
