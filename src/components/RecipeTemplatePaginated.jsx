import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { resolveRecipeTitle } from '../lib/recipeFormat'
import { buildRecipeBlocks } from '../lib/recipeBlocks'
import { paginateRecipeBlocks } from '../lib/recipePagination'
import { RecipeTitle } from './recipe/RecipeTitle'
import { RecipeItem } from './recipe/RecipeItem'
import { RecipeInstructionStep } from './recipe/RecipeInstructionStep'
import './RecipeTemplate.css'
import '../figma/recipeDesignTokens.css'

/**
 * @param {object} props — same as RecipeTemplate
 */
export function RecipeTemplatePaginated({
  category = '',
  title,
  subtitle = '',
  optional = '',
  ingredients = [],
  steps = [],
  servings = '',
  imageSrc = '',
  spacingStyle = {},
  hiddenPages = [],
  onPagesChange,
}) {
  const displayTitle = resolveRecipeTitle(title)
  const hasPhoto = Boolean(imageSrc?.trim())
  const showCategory = Boolean(category?.trim())

  const blocks = useMemo(
    () =>
      buildRecipeBlocks({
        title: displayTitle,
        subtitle,
        ingredients,
        steps,
        optional,
        servings,
        hasPhoto,
      }),
    [displayTitle, subtitle, ingredients, steps, optional, servings, hasPhoto],
  )

  const measureRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [pages, setPages] = useState(/** @type {import('../lib/recipeBlocks.js').RecipeBlock[][] | null} */ (null))

  useLayoutEffect(() => {
    const root = measureRef.current
    if (!root) return

    const heights = {}
    root.querySelectorAll('[data-block-key]').forEach((el) => {
      const key = el.getAttribute('data-block-key')
      if (key) heights[key] = el.getBoundingClientRect().height
    })

    heights['title-continued'] =
      heights['title-continued'] ?? heights.title ?? 48

    const nextPages = paginateRecipeBlocks(blocks, heights, {
      spacingStyle,
      hasImage: hasPhoto,
      title: displayTitle,
      subtitle,
    })
    setPages(nextPages)
  }, [blocks, spacingStyle, hasPhoto, displayTitle, subtitle])

  const visiblePageEntries = useMemo(() => {
    if (!pages) return []
    const hidden = new Set(hiddenPages ?? [])
    return pages
      .map((pageBlocks, pageIndex) => ({ pageBlocks, pageIndex }))
      .filter(({ pageIndex }) => !hidden.has(pageIndex))
  }, [pages, hiddenPages])

  const onPagesChangeRef = useRef(onPagesChange)
  onPagesChangeRef.current = onPagesChange

  useLayoutEffect(() => {
    if (!pages || !onPagesChangeRef.current) return
    const meta = {
      totalPages: visiblePageEntries.length,
      pageIndices: visiblePageEntries.map((e) => e.pageIndex),
    }
    onPagesChangeRef.current(meta)
  }, [pages, visiblePageEntries])

  const measureLayer = (
    <div
      ref={measureRef}
      className="recipe-template-measure"
      aria-hidden
      style={spacingStyle}
    >
      <div className="recipe-template-measure__body">
        {blocks.map((block) => (
          <RecipeBlockView
            key={block.key}
            block={block}
            displayTitle={displayTitle}
            subtitle={subtitle}
            servings={servings}
            imageSrc={imageSrc}
          />
        ))}
        <RecipeBlockView
          block={{
            type: 'title-continued',
            key: 'title-continued',
            title: displayTitle,
          }}
          displayTitle={displayTitle}
          subtitle=""
          servings=""
          imageSrc=""
        />
      </div>
    </div>
  )

  if (!pages) {
    return (
      <>
        {measureLayer}
        <article className="recipe-template recipe-template--measuring" style={spacingStyle}>
          <div className="recipe-template__card">
            <div className="recipe-template__body">
              <RecipeTitle title={displayTitle} subtitle={subtitle} />
            </div>
          </div>
        </article>
      </>
    )
  }

  return (
    <>
      {measureLayer}
      <div className="recipe-template-pages">
        {visiblePageEntries.map(({ pageBlocks, pageIndex }) => (
          <article
            key={pageIndex}
            className="recipe-template"
            style={spacingStyle}
            data-page={pageIndex + 1}
            data-page-index={pageIndex}
            data-name="Manrope with compoents"
          >
            {showCategory && pageIndex === 0 ? (
              <div className="recipe-template__category">
                <p className="recipe-template__category-text text-style-heading-2">
                  {category}
                </p>
              </div>
            ) : null}

            <div className="recipe-template__card">
              <div className="recipe-template__body">
                {renderGroupedBlocks(pageBlocks.filter((b) => b.type !== 'image'), {
                  pageIndex,
                  displayTitle,
                  subtitle,
                  servings,
                  imageSrc,
                })}
              </div>

              {pageBlocks.some((b) => b.type === 'image') ? (
                <div className="recipe-template__image">
                  <img src={imageSrc} alt="" className="recipe-template__image-photo" />
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

/**
 * @param {import('../lib/recipeBlocks.js').RecipeBlock[]} pageBlocks
 * @param {object} ctx
 */
function renderGroupedBlocks(pageBlocks, ctx) {
  const { pageIndex, displayTitle, subtitle, servings, imageSrc } = ctx
  const nodes = []
  let i = 0

  while (i < pageBlocks.length) {
    const block = pageBlocks[i]

    if (block.type === 'ingredient') {
      const group = []
      while (i < pageBlocks.length && pageBlocks[i].type === 'ingredient') {
        group.push(pageBlocks[i])
        i += 1
      }
      nodes.push(
        <div
          key={`${pageIndex}-ings`}
          className="recipe-template__list"
          data-node-id="14:140"
        >
          {group.map((b) => (
            <RecipeBlockView
              key={`${pageIndex}-${b.key}`}
              block={b}
              displayTitle={displayTitle}
              subtitle={subtitle}
              servings={servings}
              imageSrc={imageSrc}
              inList
            />
          ))}
        </div>,
      )
      continue
    }

    if (block.type === 'step') {
      const group = []
      while (i < pageBlocks.length && pageBlocks[i].type === 'step') {
        group.push(pageBlocks[i])
        i += 1
      }
      nodes.push(
        <ol
          key={`${pageIndex}-steps`}
          className="recipe-template__list recipe-template__list--steps"
          data-node-id="51:372"
        >
          {group.map((b) => (
            <RecipeBlockView
              key={`${pageIndex}-${b.key}`}
              block={b}
              displayTitle={displayTitle}
              subtitle={subtitle}
              servings={servings}
              imageSrc={imageSrc}
              inList
            />
          ))}
        </ol>,
      )
      continue
    }

    nodes.push(
      <RecipeBlockView
        key={`${pageIndex}-${block.key}`}
        block={block}
        displayTitle={displayTitle}
        subtitle={subtitle}
        servings={servings}
        imageSrc={imageSrc}
      />,
    )
    i += 1
  }

  return nodes
}

/**
 * @param {{
 *   block: import('../lib/recipeBlocks.js').RecipeBlock,
 *   displayTitle: string,
 *   subtitle: string,
 *   servings: string,
 *   imageSrc: string,
 *   inList?: boolean,
 * }} props
 */
function RecipeBlockView({ block, displayTitle, subtitle, servings, imageSrc, inList = false }) {
  const wrap = (key, children) =>
    inList ? (
      <li data-block-key={key} className="recipe-page-block">
        {children}
      </li>
    ) : (
      <div data-block-key={key} className="recipe-page-block">
        {children}
      </div>
    )

  switch (block.type) {
    case 'title':
      return wrap(
        block.key,
        <RecipeTitle title={displayTitle} subtitle={subtitle} />,
      )
    case 'title-continued':
      return wrap(
        block.key,
        <RecipeTitle title={displayTitle} subtitle="" />,
      )
    case 'ingredient':
      return wrap(
        block.key,
        <RecipeItem
          quantity={block.ingredient?.quantity ?? ''}
          unit={block.ingredient?.unit}
          name={block.ingredient?.name ?? ''}
        />,
      )
    case 'step':
      return (
        <RecipeInstructionStep
          key={block.key}
          data-block-key={block.key}
          variant={block.step?.isHeader ? 'header' : 'step'}
          index={block.step?.index ?? 1}
          text={block.step?.text ?? ''}
        />
      )
    case 'optional':
      return wrap(
        block.key,
        <div className="recipe-template__optional">
          <p className="text-style-instructions">{block.optionalText}</p>
        </div>,
      )
    case 'servings':
      return wrap(
        block.key,
        <p className="recipe-template__servings text-style-heading-2">
          {servings.toLowerCase().includes('serving')
            ? servings
            : `${servings} servings`}
        </p>,
      )
    case 'image':
      return wrap(
        block.key,
        <div className="recipe-template__image recipe-template__image--measure">
          <img src={imageSrc} alt="" className="recipe-template__image-photo" />
        </div>,
      )
    default:
      return null
  }
}
