import { generateContentWithRetry, RECIPE_RESPONSE_SCHEMA } from './gemini.js'
import { buildSystemInstruction } from './recipeExtractionPrompt.js'

/**
 * Map a Gemini recipe (heirloom schema) to the frontend's ParsedRecipe shape.
 * @param {object} r
 */
function toClientRecipe(r) {
  const ingredients = Array.isArray(r?.ingredients)
    ? r.ingredients.map((ing) => ({
        quantity: String(ing?.quantity ?? '').trim(),
        unit: String(ing?.unit ?? '').trim(),
        name: String(ing?.name ?? '').trim(),
      }))
    : []
  const steps = Array.isArray(r?.instructions)
    ? r.instructions.map((s) => String(s).trim()).filter(Boolean)
    : []
  return {
    title: String(r?.title ?? '').trim(),
    category: String(r?.category ?? '').trim() || 'Other',
    subtitle: String(r?.subtitle ?? '').trim(),
    optional: String(r?.notes ?? '').trim(),
    servings: String(r?.servings ?? '').trim(),
    ingredients,
    steps,
  }
}

/** foodBoundingBox [ymin, xmin, ymax, xmax] (0-1000) → normalized region. */
function boundingBoxToRegion(box) {
  if (!Array.isArray(box) || box.length !== 4) return null
  const [ymin, xmin, ymax, xmax] = box.map((v) => Number(v))
  if ([ymin, xmin, ymax, xmax].some((v) => Number.isNaN(v))) return null
  const region = {
    x: Math.max(0, xmin / 1000),
    y: Math.max(0, ymin / 1000),
    width: Math.min(1, (xmax - xmin) / 1000),
    height: Math.min(1, (ymax - ymin) / 1000),
  }
  if (region.width <= 0.02 || region.height <= 0.02) return null
  return region
}

function hasRecipeContent(recipe) {
  return recipe.ingredients.length > 0 || recipe.steps.length > 0
}

async function extractFromContents(contents, extraCategories) {
  const response = await generateContentWithRetry({
    contents,
    config: {
      systemInstruction: buildSystemInstruction(extraCategories),
      responseMimeType: 'application/json',
      responseSchema: RECIPE_RESPONSE_SCHEMA,
    },
  })
  const parsed = JSON.parse(response.text || '[]')
  return Array.isArray(parsed) ? parsed : [parsed]
}

/**
 * @param {{ text: string, extraCategories?: string[] }} input
 */
export async function parseTextRecipes({ text, extraCategories = [] }) {
  const raw = await extractFromContents(text, extraCategories)
  return raw.map(toClientRecipe).filter(hasRecipeContent)
}

/**
 * Parse one or more uploaded images. Each image is either a recipe page
 * (text is extracted; an embedded food photo yields a crop region) or a
 * standalone dish photo (no recipe text → matched to an extracted recipe).
 *
 * @param {{ images: { media_type?: string, data: string }[], text?: string, extraCategories?: string[] }} input
 * @returns {Promise<{
 *   recipes: object[],
 *   imageRoles: ('recipe_page' | 'food_photo')[],
 *   recipeImageMatches: (number | null)[],
 *   foodImageRegions: (object | null)[],
 * }>}
 */
export async function parseImageRecipes({ images, text = '', extraCategories = [] }) {
  const recipes = []
  const recipeImageMatches = []
  const foodImageRegions = []
  const imageRoles = images.map(() => 'food_photo')

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index]
    const contents = [
      {
        inlineData: {
          mimeType: image.media_type ?? 'image/jpeg',
          data: image.data,
        },
      },
    ]
    if (text.trim()) {
      contents.push(
        `Pasted Recipe Text / Manual Inputs to merge contextually with this image:\n${text}`,
      )
    }
    contents.push(
      'Extract, align, and structure all recipes found in this image and companion text block, returning them in the expected JSON array format.',
    )

    const raw = await extractFromContents(contents, extraCategories)

    for (const rawRecipe of raw) {
      const recipe = toClientRecipe(rawRecipe)
      if (!hasRecipeContent(recipe)) continue
      imageRoles[index] = 'recipe_page'
      const region = boundingBoxToRegion(rawRecipe?.foodBoundingBox)
      recipes.push(recipe)
      recipeImageMatches.push(region ? index : null)
      foodImageRegions.push(region)
    }
  }

  // Standalone dish photos (no recipe text found on them): attach to recipes
  // that don't yet have a food image, in order.
  const foodPhotoIndices = imageRoles
    .map((role, i) => (role === 'food_photo' ? i : null))
    .filter((i) => i !== null)
  let nextFoodPhoto = 0
  for (let i = 0; i < recipes.length; i += 1) {
    if (recipeImageMatches[i] === null && nextFoodPhoto < foodPhotoIndices.length) {
      recipeImageMatches[i] = foodPhotoIndices[nextFoodPhoto]
      foodImageRegions[i] = null // whole image is the dish
      nextFoodPhoto += 1
    }
  }

  return { recipes, imageRoles, recipeImageMatches, foodImageRegions }
}
