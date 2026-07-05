import { formatInstruction } from './recipeTextFormat.js'
import {
  isInstructionSectionHeader,
  stripCrossedOutText,
} from './recipeTextCleanup.js'

export { isInstructionSectionHeader } from './recipeTextCleanup.js'

/**
 * Normalize recipe steps to match the source layout:
 * numbered steps > paragraph breaks > line breaks > (last resort) sentences.
 */

const NUMBERED_STEP_START = /^\s*(?:step\s*)?(\d{1,2})[\.\):\-]\s+/i
const NUMBERED_STEP_MARKER = /(?:^|[\n\r])\s*(?:step\s*)?(\d{1,2})[\.\):\-]\s+/gm
const INLINE_NUMBERED_MARKER = /(?<=[.!?])\s+(?:step\s*)?(\d{1,2})[\.\):\-]\s+/g

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isNonInstructionStep(text) {
  const t = stripCrossedOutText(String(text ?? '')).trim()
  if (!t || t.length < 4) return true
  if (isInstructionSectionHeader(t)) return false
  if (/^(?:ingredients?|instructions?|directions?|method|optional|notes?)$/i.test(t)) {
    return true
  }
  if (/^yield\b/i.test(t)) return true
  if (/^makes\b/i.test(t)) return true
  if (/^serves\s+\d/i.test(t)) return true
  if (
    /^\d+[\s\-–—to]+\d*\s*(?:muffins?|cupcakes?|cookies?|servings?|serves?)\b/i.test(t)
  ) {
    return true
  }
  if (/^(?:\d+[\s\-–—to]+\d*\s+)?[a-z]+\s+servings?\.?$/i.test(t) && t.length < 60) {
    return true
  }
  if (
    t.length < 40 &&
    /\b(?:serving|servings)\b/i.test(t) &&
    !/\b(preheat|mix|bake|add|place|stir|combine|cool|enjoy)\b/i.test(t)
  ) {
    return true
  }
  return false
}

/**
 * @param {string[]} steps
 * @returns {string[]}
 */
export function filterInstructionSteps(steps) {
  return steps.map((s) => String(s).trim()).filter((s) => s && !isNonInstructionStep(s))
}

/**
 * @param {string} text
 * @param {RegExp} pattern
 * @returns {{ markerIndex: number, contentStart: number, num: number }[]}
 */
function findNumberedStepStarts(text, pattern) {
  /** @type {{ markerIndex: number, contentStart: number, num: number }[]} */
  const starts = []
  const re = new RegExp(pattern.source, pattern.flags)
  let match
  while ((match = re.exec(text)) !== null) {
    const num = Number.parseInt(match[1], 10)
    if (num >= 1 && num <= 30) {
      starts.push({
        markerIndex: match.index,
        contentStart: match.index + match[0].length,
        num,
      })
    }
  }
  return starts
}

/**
 * Collapse line wraps and repeated whitespace into single spaces.
 * @param {string} text
 * @returns {string}
 */
export function collapseWhitespace(text) {
  return String(text ?? '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/**
 * @param {string} text
 * @returns {string}
 */
function stripTrailingNonInstructionLines(text) {
  const lines = String(text).trim().split(/\n+/)
  while (lines.length && isNonInstructionStep(lines[lines.length - 1])) {
    lines.pop()
  }
  return lines.join('\n').trim()
}

/**
 * @param {string} text
 * @param {{ contentStart: number, markerIndex: number }[]} starts
 * @returns {string[]}
 */
function sliceStepsAtMarkers(text, starts) {
  const parts = []
  for (let i = 0; i < starts.length; i++) {
    const contentEnd = starts[i + 1]?.markerIndex ?? text.length
    let body = text.slice(starts[i].contentStart, contentEnd).trim()
    body = collapseWhitespace(stripTrailingNonInstructionLines(body))
    if (body && !isNonInstructionStep(body)) {
      parts.push(body)
    }
  }
  return parts
}

/**
 * @param {string} text
 * @returns {string[] | null}
 */
export function splitByNumberedMarkers(text) {
  if (!text?.trim()) return null

  let starts = findNumberedStepStarts(text, NUMBERED_STEP_MARKER)
  if (starts.length < 2) {
    starts = findNumberedStepStarts(text, INLINE_NUMBERED_MARKER)
  }
  if (starts.length < 2) return null

  const parts = sliceStepsAtMarkers(text, starts)
  return parts.length >= 2 ? parts : null
}

/**
 * @param {string} text
 * @returns {string[] | null}
 */
export function splitByParagraphBreaks(text) {
  if (!text?.trim()) return null

  const parts = text
    .split(/\n\s*\n+/)
    .map((part) => part.replace(/^\s*(?:step\s*)?\d{1,2}[\.\):\-]\s+/i, '').trim())
    .filter((part) => part && !isNonInstructionStep(part))

  return parts.length >= 2 ? parts : null
}

/**
 * @param {string} text
 * @returns {string[] | null}
 */
export function splitByLineBreaks(text) {
  if (!text?.trim()) return null

  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*(?:step\s*)?\d{1,2}[\.\):\-]\s+/i, '').trim())
    .filter((l) => l && !isNonInstructionStep(l))

  return lines.length >= 2 ? lines : null
}

/**
 * Follow source structure: numbers, then paragraphs, then lines, then sentences.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function extractStepsFromStructure(text) {
  const trimmed = stripCrossedOutText(String(text ?? '')).trim()
  if (!trimmed) return []

  const numbered = splitByNumberedMarkers(trimmed)
  if (numbered?.length) return expandInstructionSteps(numbered)

  const paragraphs = splitByParagraphBreaks(trimmed)
  if (paragraphs?.length) return expandInstructionSteps(coalesceNumberedSteps(paragraphs))

  const lines = splitByLineBreaks(trimmed)
  if (lines?.length) return expandInstructionSteps(coalesceNumberedSteps(lines))

  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s && !isNonInstructionStep(s))

  if (sentences.length >= 4 && trimmed.length > 200) {
    return sentences
  }

  return filterInstructionSteps([trimmed])
}

const COMPOUND_STEP_SPLIT =
  /\s*,\s*(?=(?:and\s+)?(?:mix|pour|bake|stir|add|place|whisk|whip|fold|blend|combine|put|remove|reduce|simmer|boil|cook|heat|serve|cover|preheat)\b)/i

/**
 * Split one instruction line into separate numbered steps when commas introduce new actions.
 * @param {string} text
 * @returns {string[]}
 */
export function splitCompoundInstruction(text) {
  const cleaned = stripCrossedOutText(String(text ?? '')).trim()
  if (!cleaned) return []
  if (isInstructionSectionHeader(cleaned)) return [cleaned]

  const parts = cleaned
    .split(COMPOUND_STEP_SPLIT)
    .map((part) => part.trim())
    .filter((part) => part && !isNonInstructionStep(part))

  return parts.length > 0 ? parts : [cleaned]
}

/**
 * Expand a step list: split compound lines, preserve section headers.
 * @param {string[]} steps
 * @returns {string[]}
 */
export function expandInstructionSteps(steps) {
  /** @type {string[]} */
  const expanded = []
  for (const step of steps ?? []) {
    const text = stripCrossedOutText(String(step ?? '')).trim()
    if (!text) continue
    if (isInstructionSectionHeader(text)) {
      expanded.push(text)
      continue
    }
    expanded.push(...splitCompoundInstruction(text))
  }
  return expanded
}

/**
 * Merge wrap continuations after a numbered line only.
 *
 * @param {string[]} steps
 * @returns {string[]}
 */
export function coalesceNumberedSteps(steps) {
  const cleaned = filterInstructionSteps(steps)
  if (cleaned.length < 2) return cleaned

  const hasNumbered = cleaned.some((s) => NUMBERED_STEP_START.test(s))
  if (!hasNumbered) return cleaned

  const merged = []
  let buffer = ''
  let inNumberedStep = false

  for (const step of cleaned) {
    const s = collapseWhitespace(step)
    if (NUMBERED_STEP_START.test(s)) {
      if (buffer) merged.push(buffer)
      buffer = s.replace(NUMBERED_STEP_START, '').trim()
      inNumberedStep = true
    } else if (inNumberedStep) {
      buffer = `${buffer} ${s}`
    } else {
      if (buffer) merged.push(buffer)
      buffer = s
      inNumberedStep = false
    }
  }

  if (buffer) merged.push(buffer)

  return merged.length > 0 ? merged : cleaned
}

/**
 * @param {string} instructions
 * @returns {string[]}
 */
export function splitInstructionsFromText(instructions) {
  return extractStepsFromStructure(instructions)
}

/**
 * @param {string[] | undefined} steps
 * @param {string} [instructions]
 * @returns {string[]}
 */
function formatSteps(steps, options = {}) {
  return expandInstructionSteps(filterInstructionSteps(steps))
    .map((step) => formatInstruction(step, options))
    .filter(Boolean)
}

/**
 * @param {string[] | undefined} steps
 * @param {string} [instructions]
 * @param {{ format?: boolean, fromImage?: boolean }} [options]
 * @returns {string[]}
 */
export function normalizeRecipeSteps(steps, instructions = '', options = {}) {
  const shouldFormat = options.format !== false
  const formatOpts = { fromImage: options.fromImage }
  const fromArray = filterInstructionSteps(
    Array.isArray(steps) ? steps.map((s) => String(s).trim()) : [],
  )

  // --- 1. If there are no steps, fall back to the instructions string ---
  if (fromArray.length === 0) {
    const text = String(instructions ?? '').trim()
    if (!text) return []
    const extracted = extractStepsFromStructure(text)
    return shouldFormat ? formatSteps(extracted, formatOpts) : filterInstructionSteps(extracted)
  }

  // --- 2. If there is exactly one step, try to expand it ---
  if (fromArray.length === 1) {
    const expanded = extractStepsFromStructure(fromArray[0])
    const result = expanded.length >= 2 ? expanded : fromArray
    return shouldFormat ? formatSteps(result, formatOpts) : filterInstructionSteps(result)
  }

  // --- 3. Check whether any item already carries a number prefix ---
  const hasNumberedItems = fromArray.some((s) => NUMBERED_STEP_START.test(s))

  if (hasNumberedItems) {
    const merged = coalesceNumberedSteps(fromArray)
    return shouldFormat ? formatSteps(merged, formatOpts) : filterInstructionSteps(merged)
  }

  // --- 4. No number prefixes: try to find numbered structure in joined text ---
  const joinedText = fromArray.join('\n')
  const fromNumbered = splitByNumberedMarkers(joinedText)
  if (fromNumbered?.length >= 2 && fromNumbered.length < fromArray.length) {
    return shouldFormat
      ? formatSteps(fromNumbered, formatOpts)
      : filterInstructionSteps(fromNumbered)
  }

  // --- 5. All items are plain (no numbers). Trust the array as-is. ---
  return shouldFormat
    ? formatSteps(fromArray, formatOpts)
    : filterInstructionSteps(fromArray)
}
