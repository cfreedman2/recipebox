import './RecipeSubMenu.css'

/**
 * Secondary actions below the recipe header — lightweight, two actions only.
 *
 * @param {{
 *   canDeletePage: boolean,
 *   onDeletePage: () => void,
 *   onAddDetails: () => void,
 * }} props
 */
export function RecipeSubMenu({ canDeletePage, onDeletePage, onAddDetails }) {
  return (
    <nav className="recipe-sub-menu" aria-label="Recipe actions">
      <button
        type="button"
        className="recipe-sub-menu__action"
        disabled={!canDeletePage}
        title="Remove the recipe page you are viewing"
        onClick={onDeletePage}
      >
        Delete page
      </button>
      <span className="recipe-sub-menu__divider" aria-hidden />
      <button
        type="button"
        className="recipe-sub-menu__action"
        onClick={onAddDetails}
      >
        Add details
      </button>
    </nav>
  )
}
