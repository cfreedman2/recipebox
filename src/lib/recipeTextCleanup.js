/**
 * Remove crossed-out / struck-through text from recipe OCR and parsing.
 * @param {string} text
 */
export function stripCrossedOutText(text) {
  return String(text ?? '')
    .replace(/~~[^~]*~~/g, '')
    .replace(/<s>[\s\S]*?<\/s>/gi, '')
    .replace(/\[\s*crossed\s*out[^\]]*\]/gi, '')
    .replace(/\(\s*crossed\s*out\s*\)/gi, '')
    .replace(/[^\S\n]{2,}/g, ' ')
    .trim()
}

/**
 * Clean a full transcript: drop empty lines after strikethrough removal.
 * @param {string} text
 */
export function cleanRecipeTranscript(text) {
  return String(text ?? '')
    .split(/\n+/)
    .map((line) => stripCrossedOutText(line))
    .filter((line) => line.length > 0)
    .join('\n')
}

/**
 * Bracket/arrow shorthand on the card — not a clean ingredient list.
 * @param {string} text
 */
export function isMessyLiteralTranscript(text) {
  const t = String(text ?? '')
  if (/\*\*?\s*literal\s+transcription/i.test(t)) return true
  if (/[⎤⎬⎦⎧⎨⎩├└┐┘]|→/.test(t)) return true
  if (/[{}]/.test(t) && /\bfry\b|\bgather\b|\bcolumn\b/i.test(t)) return true
  if (/\breconciliation notes?\b|\buncertain readings?\b/i.test(t)) return true
  if (/\bbracket|arrow notation|right-hand column|left column|connected by an arrow/i.test(t)) {
    return true
  }
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const numbered = lines.filter((l) => /^\d+\s/.test(l)).length
  if (numbered >= 3 && lines.length >= 5) return true
  return false
}

/**
 * @param {string[] | unknown[]} ingredients
 */
export function ingredientsLookMessy(ingredients) {
  return (ingredients ?? []).some((i) =>
    /[⎤⎬⎦⎧⎨⎩]|→|\[\?\]/.test(String(i ?? '')),
  )
}
/**
 * Uppercase section labels like BASE, TOPPING, FILLING.
 * @param {string} line
 */
export function isSectionHeaderLine(line) {
  const t = stripCrossedOutText(line).trim()
  if (!t || t.length > 24 || t.length < 2) return false
  if (/^\d/.test(t)) return false
  if (!/^[A-Z][A-Z0-9\s\-/&]+$/.test(t)) return false
  return t === t.toUpperCase()
}

/**
 * Method sub-headers rendered without a step number.
 * @param {string} text
 */
export function isInstructionSectionHeader(text) {
  return isSectionHeaderLine(text)
}
