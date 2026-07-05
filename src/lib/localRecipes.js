import { formatParsedRecipe, normalizeSteps, usesVerbatimTitle } from './recipeFormat'
import { cleanupRecipeImages } from './recipeImageCleanup'

const STORAGE_KEY = 'recipe-box-recipes'
const PHOTO_UPLOAD_STORE_KEY = 'recipe-box-uploaded-images-v1'

/** Drop title-only crumbs from old parsers (extra “pages” with no body). */
function pruneFragmentRecipes(recipes) {
  return recipes.filter((record) => {
    const ingredients = record.ingredients?.length ?? 0
    const steps = normalizeSteps(record).length
    const subtitle = record.subtitle?.trim()
    const optional = record.optional?.trim()
    const imageSrc = record.imageSrc?.trim()
    const servings = record.servings?.trim()
    return (
      ingredients > 0 ||
      steps > 0 ||
      Boolean(subtitle) ||
      Boolean(optional) ||
      Boolean(imageSrc) ||
      Boolean(servings)
    )
  })
}

function migrateRecord(record) {
  const base = {
    ...record,
    titleFromPhoto:
      record.titleFromPhoto ?? Boolean(String(record.photoBatchKey ?? '').trim()),
    subtitle: record.subtitle ?? '',
    optional: record.optional ?? '',
    servings: record.servings ?? '',
    imageSrc: record.imageSrc ?? '',
    imageKind: record.imageKind ?? '',
    hiddenPages: Array.isArray(record.hiddenPages)
      ? record.hiddenPages.filter((n) => Number.isInteger(n) && n >= 0)
      : [],
  }

  const formatted = formatParsedRecipe(base, { fromImage: usesVerbatimTitle(base) })

  return {
    ...base,
    title: formatted.title,
    subtitle: formatted.subtitle,
    optional: formatted.optional,
    servings: formatted.servings,
    ingredients: formatted.ingredients,
    steps: formatted.steps,
    instructions: formatted.steps.join('\n'),
  }
}

function recipeContentChanged(before, after) {
  return (
    JSON.stringify(before.ingredients ?? []) !== JSON.stringify(after.ingredients ?? []) ||
    JSON.stringify(normalizeSteps(before)) !== JSON.stringify(after.steps ?? [])
  )
}

function loadUploadedImageStore() {
  try {
    const raw = localStorage.getItem(PHOTO_UPLOAD_STORE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function tokenize(text) {
  return String(text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3)
}

function buildTokenSet(text) {
  const base = tokenize(text)
  const set = new Set(base)
  for (let i = 0; i < base.length - 1; i++) {
    set.add(`${base[i]}${base[i + 1]}`)
  }
  return set
}

function scoreTitleMatch(title, previewName) {
  const recipeTokens = buildTokenSet(title)
  const imageTokens = buildTokenSet(previewName)
  let overlap = 0
  for (const t of imageTokens) {
    if (recipeTokens.has(t)) overlap += 1
  }
  return overlap
}

function rebalanceUploadedImageAssignments(recipes) {
  const uploadedStore = loadUploadedImageStore()
  if (!uploadedStore.length) return recipes

  /** @type {Map<string, string>} */
  const previewNameByDataUrl = new Map()
  for (const entry of uploadedStore) {
    const previews = Array.isArray(entry?.previews) ? entry.previews : []
    for (const preview of previews) {
      const dataUrl = String(preview?.dataUrl ?? '')
      if (!dataUrl.startsWith('data:image/')) continue
      if (!previewNameByDataUrl.has(dataUrl)) {
        previewNameByDataUrl.set(dataUrl, String(preview?.name ?? ''))
      }
    }
  }

  const assignedUrls = [...new Set(recipes.map((r) => r.imageSrc?.trim()).filter(Boolean))]
  if (!assignedUrls.length) return recipes

  /** @type {import('./recipes').RecipeRecord[]} */
  const next = recipes.map((r) => ({ ...r }))
  let changed = false

  for (const dataUrl of assignedUrls) {
    const previewName = previewNameByDataUrl.get(dataUrl)
    if (!previewName) continue

    let bestIndex = -1
    let bestScore = 0
    for (let i = 0; i < next.length; i++) {
      const score = scoreTitleMatch(
        `${next[i].title} ${next[i].subtitle} ${next[i].category}`,
        previewName,
      )
      if (score > bestScore) {
        bestScore = score
        bestIndex = i
      }
    }
    if (bestIndex < 0 || bestScore < 1) continue

    for (let i = 0; i < next.length; i++) {
      if (next[i].imageSrc?.trim() !== dataUrl) continue
      if (i === bestIndex) {
        next[i].imageKind = next[i].imageKind || 'dish'
        continue
      }
      next[i].imageSrc = ''
      next[i].imageKind = ''
      changed = true
    }

    if (!next[bestIndex].imageSrc?.trim()) {
      next[bestIndex].imageSrc = dataUrl
      next[bestIndex].imageKind = 'dish'
      changed = true
    }
  }

  return changed ? next : recipes
}

function dedupeRecipeImages(recipes) {
  /** @type {Map<string, number>} */
  const keeperIndexBySrc = new Map()
  for (let i = 0; i < recipes.length; i++) {
    const src = recipes[i].imageSrc?.trim()
    if (!src) continue
    const existingIdx = keeperIndexBySrc.get(src)
    if (existingIdx == null) {
      keeperIndexBySrc.set(src, i)
      continue
    }
    const existingTime = Date.parse(recipes[existingIdx].created_at ?? '') || 0
    const candidateTime = Date.parse(recipes[i].created_at ?? '') || 0
    if (candidateTime >= existingTime) {
      keeperIndexBySrc.set(src, i)
    }
  }

  let changed = false
  const next = recipes.map((record, i) => {
    const src = record.imageSrc?.trim()
    if (!src) return record
    const keeperIdx = keeperIndexBySrc.get(src)
    if (keeperIdx === i) return record
    changed = true
    return {
      ...record,
      imageSrc: '',
      imageKind: '',
    }
  })

  return changed ? next : recipes
}

/**
 * @returns {import('./recipes').RecipeRecord[]}
 */
export function loadLocalRecipes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const migrated = parsed.map(migrateRecord)
    const cleaned = cleanupRecipeImages(migrated)
    const rebalanced = rebalanceUploadedImageAssignments(cleaned)
    const deduped = dedupeRecipeImages(rebalanced)
    const pruned = pruneFragmentRecipes(deduped)
    const formattingChanged = migrated.some((r, i) =>
      recipeContentChanged(parsed[i] ?? {}, r),
    )
    const changed =
      pruned.length !== migrated.length ||
      pruned.some(
        (r, i) =>
          r.imageSrc !== migrated[i].imageSrc ||
          r.imageKind !== migrated[i].imageKind,
      ) ||
      formattingChanged
    if (changed) {
      saveLocalRecipes(pruned)
    }
    return pruned
  } catch {
    return []
  }
}

/**
 * @param {import('./recipes').RecipeRecord[]} recipes
 */
export function saveLocalRecipes(recipes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
}

/**
 * @param {import('./recipes').RecipeRecord[]} added
 */
export function appendLocalRecipes(added) {
  const current = loadLocalRecipes()
  saveLocalRecipes([...current, ...added])
}

/**
 * @param {import('./recipes').RecipeRecord} updated
 * @returns {import('./recipes').RecipeRecord}
 */
export function updateLocalRecipe(updated) {
  const current = loadLocalRecipes()
  const next = current.map((r) => (r.id === updated.id ? migrateRecord(updated) : r))
  saveLocalRecipes(next)
  return migrateRecord(updated)
}
