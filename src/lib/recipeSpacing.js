/**

 * Dynamic recipe spacing — scales with content density.

 * Dense recipes use minimum values; sparse recipes use maximum values.

 *

 * Page (14:125): fixed 24px → border → inner padding (dynamic).

 */



const CAPACITY = 38



/** @param {number} units @param {number} min @param {number} max */

function spacingForContent(units, min, max) {

  const t = Math.min(1, Math.max(0, units / CAPACITY))

  return Math.round(max - t * (max - min))

}



/**

 * @param {{

 *   title?: string,

 *   subtitle?: string,

 *   ingredients?: unknown[],

 *   steps?: string[],

 *   optional?: string,

 *   servings?: string,

 *   hasImage?: boolean,

 * }} recipe

 */

export function estimateContentUnits(recipe) {

  const title = recipe.title?.trim() ?? ''

  const subtitle = recipe.subtitle?.trim() ?? ''

  const optional = recipe.optional?.trim() ?? ''

  const ingredients = recipe.ingredients ?? []

  const steps = recipe.steps ?? []



  let units = 0

  units += Math.min(title.length / 18, 4)

  units += subtitle ? Math.ceil(subtitle.length / 55) : 0

  units += optional ? Math.ceil(optional.length / 55) : 0

  units += ingredients.length * 1.15

  units += steps.length * 1.4

  units += steps.reduce((n, s) => n + Math.ceil(String(s).length / 48), 0)

  if (recipe.servings?.trim()) units += 0.75

  if (recipe.hasImage) units += 2.5

  return units

}



/**

 * @param {Parameters<typeof estimateContentUnits>[0]} recipe

 * @returns {Record<string, string>}

 */

export function computeRecipeSpacingStyle(recipe) {

  const units = estimateContentUnits(recipe)



  return {

    '--pad-top': `${spacingForContent(units, 32, 56)}px`,

    '--pad-bottom': `${spacingForContent(units, 16, 32)}px`,

    '--gap-section': `${spacingForContent(units, 16, 32)}px`,

    '--gap-between-steps': '4px',

    '--gap-row-content': '12px',

    '--gap-measure-text': '4px',

    '--gap-title-subtitle': '4px',

    '--image-height': `${spacingForContent(units, 100, 200)}px`,

  }

}

