import { parseIngredientLine, normalizeIngredients } from './ingredientParse.js'
import { normalizeRecipeSteps } from './instructionSteps.js'
import { formatParsedRecipe } from './recipeFormat.js'


const CATEGORY_KEYWORDS = [

  ['Poultry', /\b(chicken|turkey|duck)\b/i],

  ['Beef', /\b(beef|steak|brisket)\b/i],

  ['Lamb', /\b(lamb|mutton)\b/i],

  ['Fish', /\b(fish|salmon|tuna|cod|trout|shrimp|seafood)\b/i],

  ['Salads', /\b(salad|greens|lettuce)\b/i],

  ['Soups', /\b(soup|stew|broth|chowder)\b/i],

  ['Desserts', /\b(cake|cookie|dessert|chocolate|pie|brownie)\b/i],

  ['Pasta', /\b(pasta|spaghetti|noodle|lasagna|penne|vodka)\b/i],

  ['Dairy', /\b(dairy|cream|cheese|milk|butter)\b/i],

  ['Breakfast', /\b(breakfast|pancake|waffle|omelet|oatmeal)\b/i],

  ['Sides', /\b(side|rice|potato|vegetable)\b/i],

]



const INSTRUCTION_VERBS =

  /^(cook|heat|stir|add|pour|place|bake|serve|season|simmer|remove|reduce|preheat|mix|combine|drain|toss|blend|sauté|saute|bring|cover|whisk|fold|transfer)/i



const UNIT_WORDS =

  /\b(cup|cups|tsp|tbsp|teaspoon|tablespoon|ounce|oz|lb|pound|clove|bunch|pinch|package|can|tablespoons?|teaspoons?)\b/i



function guessCategory(text, extraCategories = []) {

  const haystack = text.toLowerCase()

  for (const [cat, re] of CATEGORY_KEYWORDS) {

    if (re.test(haystack)) return cat

  }

  for (const cat of extraCategories) {

    if (haystack.includes(cat.toLowerCase())) return cat

  }

  return 'Sides'

}



function isIngredientLine(line) {

  const t = line.trim()

  if (!t || t.length < 2) return false

  if (INSTRUCTION_VERBS.test(t) && t.length > 40) return false

  return (

    /^\s*[-•*]/.test(t) ||

    /^\s*[\d¼½⅓⅔⅛⅜⅝⅞(]/.test(t) ||

    UNIT_WORDS.test(t)

  )

}



function isInstructionLine(line) {

  const t = line.trim()

  return (

    /^\s*\d+[\).\]:]/.test(t) ||

    (INSTRUCTION_VERBS.test(t) && t.length > 25)

  )

}



function isSectionHeader(line) {

  return /^(ingredients?|instructions?|directions?|method|optional|notes?|yield)$/i.test(

    line.trim(),

  )

}



function isCategoryLine(line, title) {

  const t = line.trim()

  if (!t || t.length > 30) return false

  if (t === title) return false

  if (isIngredientLine(t) || isInstructionLine(t)) return false

  if (/^yield/i.test(t)) return false

  return /^[A-Za-z][a-z]+(\s+[A-Za-z][a-z]+)?$/.test(t)

}



/** True if this line is a recipe title, not an ingredient or step */

function isTitleLine(line) {

  const t = line.trim()

  if (!t || t.length > 100 || t.length < 4) return false

  if (isSectionHeader(t)) return false

  if (isInstructionLine(t)) return false

  if (isIngredientLine(t)) return false

  if (/^[\d\s|iIl1]+$/.test(t)) return false

  if (/^[a-z]{1,3}$/i.test(t)) return false

  return true

}



function findTitleIndex(lines) {

  const head = lines.slice(0, 12)

  const capsIdx = head.findIndex(

    (l) =>

      l.length >= 8 &&

      l.length < 70 &&

      /^[A-ZÀ-ÖØ-Þ0-9\s'’\-–—&,]+$/.test(l) &&

      /[A-Z]{3,}/.test(l),

  )

  if (capsIdx >= 0) return capsIdx



  const titleIdx = head.findIndex(isTitleLine)

  return titleIdx >= 0 ? titleIdx : 0

}



function looksLikeIngredientStart(line) {

  return /^\s*[\d¼½⅓⅔⅛⅜⅝⅞(]/.test(line) || /^\s*[-•*]/.test(line)

}



function mergeContinuationLines(lines) {

  /** @type {string[]} */

  const out = []

  for (const line of lines) {

    const t = line.trim()

    if (!t) continue

    const prev = out[out.length - 1]

    if (

      prev &&

      !looksLikeIngredientStart(t) &&

      !isInstructionLine(t) &&

      !isSectionHeader(t) &&

      (isIngredientLine(prev) || !INSTRUCTION_VERBS.test(t)) &&

      !INSTRUCTION_VERBS.test(prev)

    ) {

      out[out.length - 1] = `${prev} ${t}`

    } else {

      out.push(t)

    }

  }

  return out

}



function extractServings(lines) {

  for (const line of lines) {

    const yieldMatch = line.match(

      /^(?:yield:?\s*)?(\d+(?:\s+to\s+\d+)?)\s*servings?\.?$/i,

    )

    if (yieldMatch) return `${yieldMatch[1]} servings`



    const m = line.match(/^(\d+(?:\s+to\s+\d+)?)\s*servings?\.?$/i)

    if (m) return `${m[1]} servings`

  }

  return ''

}



function extractSubtitle(lines, titleIndex, contentStart) {

  if (contentStart <= titleIndex + 1) return ''

  const between = lines.slice(titleIndex + 1, contentStart)

  const para = between.filter(

    (l) =>

      !isSectionHeader(l) &&

      !isCategoryLine(l, lines[titleIndex]) &&

      !isIngredientLine(l) &&

      !isInstructionLine(l) &&

      !/^yield/i.test(l) &&

      l.length > 30,

  )

  return para.join(' ').trim()

}



function expandIngredientAbbrev(text) {
  return String(text ?? '')
    .trim()
    .replace(/^s\s*&\s*p$/i, 'Salt & pepper')
    .replace(/^s&p$/i, 'Salt & pepper')
}

function cleanIngredientPhrase(text) {
  return expandIngredientAbbrev(
    String(text ?? '')
      .trim()
      .replace(/^the\s+/i, '')
      .replace(/\s*\([^)]*\)\s*$/g, '')
      .trim(),
  )
}

function splitIngredientList(text) {
  return String(text ?? '')
    .split(/\s*,\s*|\s+and\s+/i)
    .map(cleanIngredientPhrase)
    .filter((p) => p.length > 1 && isLikelyIngredient(p))
}

function isLikelyIngredient(phrase) {
  const t = String(phrase ?? '').trim()
  if (!t || t.length < 2) return false
  if (/^(?:well|then|cover|uncover|serve|remove|reduce|mix)$/i.test(t)) return false
  if (/\b(?:until|while|before|after|when)\b/i.test(t)) return false
  if (
    /^(?:mix|stir|bake|roast|cook|simmer|boil|grill|cover|whisk|fold|transfer|preheat)\s+/i.test(
      t,
    )
  ) {
    return false
  }
  return true
}

function extractNarrativeIngredients(text) {
  const found = []
  const seen = new Set()
  const add = (phrase) => {
    for (const part of splitIngredientList(phrase)) {
      const key = part.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      found.push(part)
    }
  }

  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const flavourMatch = trimmed.match(/(?:flavou?r|season)\s+with\s+(.+?)(?:\.\s*|$)/i)
    if (flavourMatch) add(flavourMatch[1])

    const addMatch = trimmed.match(/\badd\s+(.+?)(?:\.\s*|$)/i)
    if (addMatch) add(addMatch[1])

    // Only opening lines like "Roast X with Y" — not procedural steps (Mix well, cover, bake…).
    const cookMatch = trimmed.match(
      /\b(?:roast|bake|cook|sauté|saute|simmer|boil|grill)\s+(.+?)(?:\.\s*|$)/i,
    )
    if (cookMatch) {
      const clause = cookMatch[1]
      const withMatch = clause.match(/^(.+?)\s+with\s+(.+)$/i)
      if (withMatch) {
        add(withMatch[1])
        add(withMatch[2])
      } else {
        add(clause)
      }
    }
  }

  return found
}

function buildNarrativeTitle(text) {
  const lower = text.toLowerCase()
  const hasSquash = /\bbutternut\b|\bsquash\b/.test(lower)
  const hasSweetPotato = /\bsweet potato/.test(lower)
  const hasGreenBeans = /\bgreen bean/.test(lower)

  if (hasSquash && hasSweetPotato && hasGreenBeans) return 'Roasted Squash & Green Beans'
  if (hasSquash && hasGreenBeans) return 'Roasted Squash & Green Beans'
  if (hasSweetPotato && hasGreenBeans) return 'Roasted Sweet Potato & Green Beans'
  if (hasSquash || hasSweetPotato) {
    return hasSquash && hasSweetPotato
      ? 'Roasted Squash or Sweet Potato'
      : hasSquash
        ? 'Roasted Butternut Squash'
        : 'Roasted Sweet Potatoes'
  }

  const first = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)[0] ?? ''
  if (first.length <= 48) return first.replace(/\.$/, '')
  return `${first.slice(0, 45).trim()}…`
}

function isNarrativeRecipeBlock(lines) {
  if (lines.some((l) => /^ingredients?$/i.test(l.trim()))) return false
  if (lines.some((l) => /^instructions?$/i.test(l.trim()) || /^directions?$/i.test(l.trim()))) {
    return false
  }

  const quantified = lines.filter(
    (l) => /^\s*[\d¼½⅓⅔⅛⅜⅝⅞(]/.test(l) || (UNIT_WORDS.test(l) && !INSTRUCTION_VERBS.test(l)),
  )
  if (quantified.length >= 2) return false

  const merged = mergeContinuationLines(lines)
  if (merged.length < 2) return false

  const instructionish = merged.filter(
    (l) => INSTRUCTION_VERBS.test(l.trim()) || /^(?:flavou?r|season)\b/i.test(l.trim()),
  )
  return instructionish.length >= Math.max(2, merged.length - 1)
}

function parseNarrativeBlock(block, extraCategories) {
  const paragraphs = block
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!paragraphs.length) return null

  const fullText = paragraphs.join('\n')
  const ingredients = normalizeIngredients(extractNarrativeIngredients(fullText))
  const title = buildNarrativeTitle(fullText)

  return {
    title,
    category: guessCategory(fullText, extraCategories),
    subtitle: '',
    optional: '',
    servings: extractServings(paragraphs),
    ingredients,
    steps: normalizeRecipeSteps(undefined, fullText),
  }
}

function splitIntoRecipeBlocks(text) {

  const byRule = text

    .split(/\n\s*[-=]{4,}\s*\n/)

    .map((b) => b.trim())

    .filter(Boolean)



  if (byRule.length > 1) return byRule



  return [text.trim()]

}



function parseBlock(block, extraCategories) {

  let lines = block

    .split(/\n+/)

    .map((l) => l.trim())

    .filter(Boolean)



  lines = mergeContinuationLines(lines)

  if (!lines.length) return null

  if (isNarrativeRecipeBlock(lines)) {
    return parseNarrativeBlock(block, extraCategories)
  }



  const titleIndex = findTitleIndex(lines)

  let title = lines[titleIndex].replace(/^#+\s*/, '').trim()

  if (isSectionHeader(title)) title = 'Untitled Recipe'



  let categoryFromLine = ''

  if (lines[titleIndex + 1] && isCategoryLine(lines[titleIndex + 1], title)) {

    categoryFromLine = lines[titleIndex + 1].trim()

  }



  let ingredientsStart = -1

  let instructionsStart = -1

  let optionalStart = -1



  lines.forEach((line, i) => {

    if (/^ingredients?/i.test(line)) ingredientsStart = i + 1

    if (/^instructions?/i.test(line) || /^directions?/i.test(line) || /^method$/i.test(line)) {

      instructionsStart = i + 1

    }

    if (/^optional/i.test(line) || /^notes?$/i.test(line)) optionalStart = i + 1

  })



  const contentStart =

    ingredientsStart >= 0

      ? ingredientsStart

      : instructionsStart >= 0

        ? instructionsStart

        : titleIndex + (categoryFromLine ? 2 : 1)



  let ingredientLines = []

  let stepLines = []

  let optionalLines = []



  const sectionEnd = (from) => {

    const stops = [instructionsStart, optionalStart]

      .filter((i) => i >= 0 && i > from)

      .sort((a, b) => a - b)

    return stops[0] ?? lines.length

  }



  if (ingredientsStart >= 0 && instructionsStart >= 0) {

    ingredientLines = lines.slice(ingredientsStart, instructionsStart - 1)

    const stepEnd = optionalStart >= 0 ? optionalStart - 1 : lines.length

    stepLines = lines.slice(instructionsStart, stepEnd)

  } else if (ingredientsStart >= 0) {

    ingredientLines = lines.slice(ingredientsStart, sectionEnd(ingredientsStart))

  } else if (instructionsStart >= 0) {

    const stepEnd = optionalStart >= 0 ? optionalStart - 1 : lines.length

    stepLines = lines.slice(instructionsStart, stepEnd)

  } else {

    const firstInstruction = lines.findIndex(

      (l, i) => i > titleIndex && isInstructionLine(l),

    )

    if (firstInstruction > titleIndex) {

      ingredientLines = lines

        .slice(titleIndex + (categoryFromLine ? 2 : 1), firstInstruction)

        .filter(

          (l) =>

            !isSectionHeader(l) &&

            !/^yield/i.test(l) &&

            (isIngredientLine(l) || !INSTRUCTION_VERBS.test(l)),

        )

      stepLines = lines.slice(firstInstruction).filter((l) => !/^yield/i.test(l))

    } else {

      const afterTitle = lines.slice(titleIndex + (categoryFromLine ? 2 : 1))

      const splitAt = afterTitle.findIndex((l) => isInstructionLine(l))

      if (splitAt > 0) {

        ingredientLines = afterTitle.slice(0, splitAt).filter((l) => !/^yield/i.test(l))

        stepLines = afterTitle.slice(splitAt).filter((l) => !/^yield/i.test(l))

      } else {

        ingredientLines = afterTitle.filter(isIngredientLine)

        stepLines = afterTitle.filter(

          (l) => !isIngredientLine(l) && !isSectionHeader(l) && !/^yield/i.test(l),

        )

      }

    }

  }



  ingredientLines = ingredientLines

    .map((l) => l.replace(/^[-•*]\s*/, '').trim())

    .filter(

      (l) =>

        l &&

        !/^(\d+\s*)?servings?$/i.test(l) &&

        !/^yield/i.test(l) &&

        l.length > 2 &&

        !/^[\d\s|iIl1]{1,4}$/.test(l),

    )



  stepLines = stepLines

    .map((l) => l.replace(/^\s*\d+[\).\]:]\s*/, '').trim())

    .filter(

      (l) =>

        l &&

        !/^(\d+\s*)?servings?$/i.test(l) &&

        !/^yield/i.test(l) &&

        (INSTRUCTION_VERBS.test(l) || l.length > 20),

    )



  if (optionalStart >= 0) {

    optionalLines = lines

      .slice(optionalStart)

      .filter((l) => !isSectionHeader(l) && !/^(\d+\s*)?servings?$/i.test(l))

  }



  const ingredients = normalizeIngredients(ingredientLines)

  const servings = extractServings(lines)

  const subtitle = extractSubtitle(lines, titleIndex, contentStart)

  const optional = optionalLines.join(' ').trim()



  const category =

    categoryFromLine ||

    guessCategory(`${title}\n${ingredientLines.join('\n')}`, extraCategories)



  return {

    title: title || 'Untitled Recipe',

    category,

    subtitle,

    optional,

    servings,

    ingredients,

    steps: normalizeRecipeSteps(stepLines),

  }

}



/**

 * @returns {import('./recipes').ParsedRecipe[]}

 */

export function parseRecipeText(text, extraCategories = []) {

  const normalized = text.trim()

  if (!normalized) return []



  const blocks = splitIntoRecipeBlocks(normalized)

  return blocks
    .map((b) => parseBlock(b, extraCategories))
    .filter(Boolean)
    .map((recipe) => formatParsedRecipe(recipe))
}


