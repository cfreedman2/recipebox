import { blockSection } from './recipeBlocks.js'

const PAGE_HEIGHT_PX = 841
const PAGE_OUTER_PADDING_PX = 48
const CARD_BORDER_PX = 2

/**
 * @param {string | undefined} value
 */
function parsePx(value) {
  if (!value) return 0
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {Record<string, string>} spacingStyle
 * @param {boolean} reserveImage
 */
export function getPageBodyCapacity(spacingStyle, reserveImage = false) {
  const padTop = parsePx(spacingStyle['--pad-top'] ?? '56px')
  const padBottom = parsePx(spacingStyle['--pad-bottom'] ?? '24px')
  const imageH = reserveImage
    ? parsePx(spacingStyle['--image-height'] ?? '150px')
    : 0

  return PAGE_HEIGHT_PX - PAGE_OUTER_PADDING_PX - CARD_BORDER_PX - padTop - padBottom - imageH
}

/**
 * @param {import('./recipeBlocks.js').RecipeBlock} a
 * @param {import('./recipeBlocks.js').RecipeBlock} b
 * @param {number} gapSectionPx
 */
function gapBetweenBlocks(a, b, gapSectionPx) {
  if (!a || !b) return 0
  return blockSection(a) !== blockSection(b) ? gapSectionPx : 0
}

/**
 * @param {import('./recipeBlocks.js').RecipeBlock[]} pageBlocks
 * @param {Record<string, number>} heights
 * @param {number} gapSectionPx
 */
function pageContentHeight(pageBlocks, heights, gapSectionPx) {
  let used = 0
  for (let i = 0; i < pageBlocks.length; i++) {
    const block = pageBlocks[i]
    if (i > 0) {
      used += gapBetweenBlocks(pageBlocks[i - 1], block, gapSectionPx)
    }
    used += heights[block.key] ?? 0
  }
  return used
}

/**
 * @param {import('./recipeBlocks.js').RecipeBlock[]} blocks
 * @param {Record<string, number>} heights
 * @param {object} options
 * @param {Record<string, string>} options.spacingStyle
 * @param {boolean} options.hasImage
 * @param {string} options.title
 */
export function paginateRecipeBlocks(blocks, heights, { spacingStyle, hasImage, title }) {
  const gapSection = parsePx(spacingStyle['--gap-section'] ?? '24px')
  const contentBlocks = blocks.filter((b) => b.type !== 'image')
  const imageBlock = blocks.find((b) => b.type === 'image')
  const titleContinuedHeight =
    heights['title-continued'] ?? heights.title ?? 48

  const continuedTitle = (pageIndex) => ({
    type: 'title-continued',
    key: `title-${pageIndex}`,
    title,
    subtitle: '',
  })

  /** @type {import('./recipeBlocks.js').RecipeBlock[][]} */
  const pages = [[]]
  let pageIndex = 0
  let used = 0
  const fullCap = () => getPageBodyCapacity(spacingStyle, false)

  const startNewPage = () => {
    pageIndex += 1
    pages.push([])
    used = 0
    const head = continuedTitle(pageIndex)
    pages[pageIndex].push(head)
    used += titleContinuedHeight
  }

  for (let i = 0; i < contentBlocks.length; i++) {
    const block = contentBlocks[i]
    const h = heights[block.key] ?? 0
    const prev = pages[pageIndex][pages[pageIndex].length - 1]
    const gap = gapBetweenBlocks(prev, block, gapSection)

    if (pages[pageIndex].length > 0 && used + gap + h > fullCap()) {
      startNewPage()
      const gap2 = gapBetweenBlocks(
        pages[pageIndex][pages[pageIndex].length - 1],
        block,
        gapSection,
      )
      used += gap2
    } else if (pages[pageIndex].length > 0) {
      used += gap
    }

    pages[pageIndex].push(block)
    used += h
  }

  if (imageBlock) {
    const capWithImage = getPageBodyCapacity(spacingStyle, true)
    const imgH = heights.image ?? 0

    while (pages.length > 0) {
      const last = pages[pages.length - 1]
      const contentH = pageContentHeight(last, heights, gapSection)
      const total = contentH + (last.length > 0 ? gapSection : 0) + imgH
      if (total <= capWithImage) {
        last.push(imageBlock)
        break
      }

      const tail = last[last.length - 1]
      if (tail?.type === 'title' || tail?.type === 'title-continued') {
        pages.push([continuedTitle(pages.length), imageBlock])
        break
      }

      const moved = last.pop()
      if (last.length === 0) pages.pop()
      pages.push([continuedTitle(pages.length), moved])
    }
  }

  return pages.filter((p) => p.length > 0)
}
