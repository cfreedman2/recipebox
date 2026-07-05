import './RecipeRecipeHeader.css'

/**
 * @param {{ title: string, category?: string }} props
 */
export function RecipeRecipeHeader({ title, category }) {
  const showCategory = Boolean(category?.trim())

  return (
    <header className="recipe-recipe-header">
      <h2 className="recipe-recipe-header__title">{title}</h2>
      {showCategory ? (
        <p className="recipe-recipe-header__category">{category}</p>
      ) : null}
    </header>
  )
}
