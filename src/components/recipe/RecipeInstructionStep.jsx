import { RecipeRowNumber } from './RecipeRowNumber'
import './RecipeInstructionStep.css'

/**
 * Figma component "Step" (51:343) — numbered instruction
 * @param {{ index?: number, text: string, variant?: 'step' | 'header' }} props
 */
export function RecipeInstructionStep({ index, text, variant = 'step', ...rest }) {
  const isHeader = variant === 'header'

  return (
    <li
      className={`recipe-instruction-step${isHeader ? ' recipe-instruction-step--header' : ''}`}
      data-name="Step"
      {...rest}
    >
      {isHeader ? (
        <p className="recipe-instruction-step__heading text-style-heading-2">{text}</p>
      ) : (
        <>
          <RecipeRowNumber value={index ?? 1} />
          <p className="recipe-instruction-step__text text-style-instructions">{text}</p>
        </>
      )}
    </li>
  )
}
