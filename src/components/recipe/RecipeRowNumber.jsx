import './RecipeRowNumber.css'

/**
 * Figma component "Step" (49:92) — 18px number column, ExtraLight
 * @param {{ value: string | number, className?: string }} props
 */
export function RecipeRowNumber({ value, className = '' }) {
  return (
    <div className={`recipe-row-number ${className}`.trim()} data-name="Step">
      <p className="recipe-row-number__value text-style-measurement">{value}</p>
    </div>
  )
}
