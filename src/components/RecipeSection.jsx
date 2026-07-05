import { useCallback, useMemo, useRef } from 'react'
import { RecipeRecipeHeader } from './RecipeRecipeHeader'
import { RecipeSubMenu } from './RecipeSubMenu'
import { RecipeTemplatePaginated } from './RecipeTemplatePaginated'
import { recordToTemplateProps } from '../lib/recipeFormat'
import { useVisibleRecipePage } from '../hooks/useVisibleRecipePage'

/**
 * @param {{
 *   record: import('../lib/recipes').RecipeRecord,
 *   pageMeta?: { totalPages: number, pageIndices: number[] },
 *   onPagesChange: (recipeId: string, meta: { totalPages: number, pageIndices: number[] }) => void,
 *   onDeletePage: (record: import('../lib/recipes').RecipeRecord, pageIndex: number) => void,
 *   onAddDetails: (record: import('../lib/recipes').RecipeRecord) => void,
 * }} props
 */
export function RecipeSection({
  record,
  pageMeta,
  onPagesChange,
  onDeletePage,
  onAddDetails,
}) {
  const sectionRef = useRef(/** @type {HTMLElement | null} */ (null))
  const props = useMemo(() => recordToTemplateProps(record), [record])
  const pageCount = pageMeta?.totalPages ?? 1
  const canDeletePage = pageCount >= 1
  const visiblePageIndex = useVisibleRecipePage(sectionRef, pageCount)

  const handlePagesChange = useCallback(
    (meta) => onPagesChange(record.id, meta),
    [record.id, onPagesChange],
  )

  function handleDeletePage() {
    if (!canDeletePage) return

    const fallback = pageMeta?.pageIndices?.[0] ?? 0
    const pageIndex =
      visiblePageIndex != null && !Number.isNaN(visiblePageIndex)
        ? visiblePageIndex
        : fallback

    onDeletePage(record, pageIndex)
  }

  return (
    <section
      ref={sectionRef}
      id={`recipe-${record.id}`}
      className="recipe-scroll__recipe"
    >
      <RecipeRecipeHeader title={props.title} category={props.category} />
      <RecipeSubMenu
        canDeletePage={canDeletePage}
        onDeletePage={handleDeletePage}
        onAddDetails={() => onAddDetails(record)}
      />
      <RecipeTemplatePaginated
        {...props}
        hiddenPages={record.hiddenPages ?? []}
        onPagesChange={handlePagesChange}
      />
    </section>
  )
}
