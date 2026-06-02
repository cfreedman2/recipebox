export function splitByNumberedMarkers(text) {
  if (!text) return []
  // Match lines starting with number followed by . or )
  const lines = text.split('\n')
  const steps = []
  let current = ''

  for (const line of lines) {
    const match = line.match(/^\s*\d+[\.\)]\s*(.*)$/)
    if (match) {
      if (current.trim()) steps.push(current.trim())
      current = match[1]
    } else {
      if (current) current += ' ' + line.trim()
    }
  }
  if (current.trim()) steps.push(current.trim())
  return steps.filter(s => s.length > 0)
}

export function splitByParagraphBreaks(text) {
  if (!text) return []
  return text
    .split(/\n\s*\n/)
    .map(s => s.replace(/\n/g, ' ').trim())
    .filter(s => s.length > 0)
}

export function parseInstructionsRaw(raw) {
  if (!raw) return []

  // Try numbered markers first
  const byNumbers = splitByNumberedMarkers(raw)
  if (byNumbers.length > 1) return byNumbers

  // Try paragraph breaks
  const byParagraphs = splitByParagraphBreaks(raw)
  if (byParagraphs.length > 1) return byParagraphs

  // Fall back to line breaks
  return raw
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)
}
