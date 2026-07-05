import { useUnitSystem } from '../../context/UnitSystemContext'
import { convertIngredient } from '../../lib/unitUtils'
import { isSectionHeaderLine } from '../../lib/recipeTextCleanup'
import { RecipeRowNumber } from './RecipeRowNumber'
import './RecipeItem.css'

/**
 * One paragraph — quantity in the number column; name aligns with step text.
 * @param {{ quantity: string, unit?: string, name: string }} props
 */
export function RecipeItem({ quantity, unit = '', name }) {
  const { system } = useUnitSystem()
  const converted = convertIngredient(quantity, unit, system)
  const showUnit = Boolean(converted.unit?.trim())
  const hasQuantity = Boolean(converted.quantity?.trim())
  const isSectionLabel = !hasQuantity && isSectionHeaderLine(name)

  return (
    <div
      className={`recipe-item${hasQuantity ? '' : ' recipe-item--no-quantity'}${isSectionLabel ? ' recipe-item--section-label' : ''}`}
      data-name="item"
    >
      {hasQuantity ? (
        <RecipeRowNumber value={converted.quantity} />
      ) : (
        <RecipeRowNumber value="" className="recipe-row-number--spacer" aria-hidden="true" />
      )}
      <p className="recipe-item__text text-style-ingredients">
        {showUnit ? <span className="measurement">{converted.unit} </span> : null}
        {name}
      </p>
    </div>
  )
}
