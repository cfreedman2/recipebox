import { useCallback, useState } from 'react'
import { RecipeSection } from './RecipeSection'
import { EditRecipeModal } from './EditRecipeModal'
import './RecipeScrollView.css'

/**
 * @param {{
 *   recipes: import('../lib/recipes').RecipeRecord[],
 *   loading?: boolean,
 *   extraCategories: string[],
 *   onUpdateRecipe: (recipe: import('../lib/recipes').RecipeRecord) => Promise<import('../lib/recipes').RecipeRecord>,
 *   onDeleteRecipe: (recipeId: string) => Promise<void>,
 * }} props
 */
export function RecipeScrollView({
  recipes,
  loading,
  extraCategories,
  onUpdateRecipe,
  onDeleteRecipe,
}) {
  /** @type {Record<string, { totalPages: number, pageIndices: number[] }>} */
  const [pageMetaById, setPageMetaById] = useState({})
  const [editingRecipe, setEditingRecipe] = useState(
    /** @type {import('../lib/recipes').RecipeRecord | null} */ (null),
  )

  const handlePagesChange = useCallback((recipeId, meta) => {
    setPageMetaById((prev) => {
      const existing = prev[recipeId]
      if (
        existing &&
        existing.totalPages === meta.totalPages &&
        existing.pageIndices.length === meta.pageIndices.length &&
        existing.pageIndices.every((v, i) => v === meta.pageIndices[i])
      ) {
        return prev
      }
      return { ...prev, [recipeId]: meta }
    })
  }, [])

  async function handleDeletePage(record, pageIndex) {
    const totalVisiblePages = pageMetaById[record.id]?.totalPages ?? 1
    if (totalVisiblePages <= 1) {
      if (!window.confirm('Delete this page? This recipe will be removed.')) return
      await onDeleteRecipe(record.id)
      return
    }

    const hidden = new Set(record.hiddenPages ?? [])

    if (hidden.has(pageIndex)) return

    const visibleNum =
      (pageMetaById[record.id]?.pageIndices.indexOf(pageIndex) ?? 0) + 1

    if (
      !window.confirm(
        `Delete page ${visibleNum}? Content on this page will no longer appear in the recipe.`,
      )
    ) {
      return
    }

    await onUpdateRecipe({
      ...record,
      hiddenPages: [...hidden, pageIndex],
    })
  }

  if (loading) {
    return (
      <div id="recipes" className="recipe-scroll recipe-scroll--empty">
        <p>Loading recipes…</p>
      </div>
    )
  }

  if (!recipes.length) {
    return (
      <div id="recipes" className="recipe-scroll recipe-scroll--empty">
        <p>No recipes yet. Click <strong>+ New Recipe</strong> to add one.</p>
      </div>
    )
  }

  return (
    <>
      <div id="recipes" className="recipe-scroll">
        {recipes.map((record) => (
          <RecipeSection
            key={record.id}
            record={record}
            pageMeta={pageMetaById[record.id]}
            onPagesChange={handlePagesChange}
            onDeletePage={handleDeletePage}
            onAddDetails={setEditingRecipe}
          />
        ))}
      </div>

      <EditRecipeModal
        open={Boolean(editingRecipe)}
        recipe={editingRecipe}
        extraCategories={extraCategories}
        onClose={() => setEditingRecipe(null)}
        onSave={async (updated) => {
          await onUpdateRecipe(updated)
          setEditingRecipe(null)
        }}
      />
    </>
  )
}
