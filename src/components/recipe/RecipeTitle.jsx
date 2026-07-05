import { RecipeRowNumber } from './RecipeRowNumber'
import './RecipeTitle.css'

/**
 * Figma component "Recipe title" (49:69)
 * @param {{ title: string, subtitle?: string }} props
 */
export function RecipeTitle({ title, subtitle = '' }) {
  const showSubtitle = Boolean(subtitle?.trim())

  return (
    <header className="recipe-title recipe-aligned-row" data-name="Recipe title" data-node-id="49:69">
      <RecipeRowNumber value="" className="recipe-row-number--spacer" aria-hidden="true" />
      <div className="recipe-title__content">
        <h1 className="recipe-title__heading text-style-title">{title}</h1>
        {showSubtitle ? (
          <p className="recipe-title__subtitle text-style-instructions">{subtitle}</p>
        ) : null}
      </div>
    </header>
  )
}
