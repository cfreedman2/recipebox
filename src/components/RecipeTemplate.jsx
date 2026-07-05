import { resolveRecipeTitle } from '../lib/recipeFormat'
import { isInstructionSectionHeader } from '../lib/instructionSteps'
import { RecipeTitle } from './recipe/RecipeTitle'
import { RecipeItem } from './recipe/RecipeItem'
import { RecipeInstructionStep } from './recipe/RecipeInstructionStep'
import './RecipeTemplate.css'
import '../figma/recipeDesignTokens.css'

/**
 * Figma frame "Manrope with compoents" (14:125) — recipe card layout
 *
 * @param {object} props
 * @param {string} [props.category]
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {string} [props.optional]
 * @param {{ quantity: string, unit?: string, name: string }[]} [props.ingredients]
 * @param {string[]} [props.steps]
 * @param {string} [props.servings]
 * @param {string} [props.imageSrc]
 * @param {Record<string, string>} [props.spacingStyle]
 */
export function RecipeTemplate({
  category = '',
  title,
  subtitle = '',
  optional = '',
  ingredients = [],
  steps = [],
  servings = '',
  imageSrc = '',
  spacingStyle = {},
}) {
  const displayTitle = resolveRecipeTitle(title)
  const showIngredients = ingredients.length > 0
  const showSteps = steps.length > 0
  const showOptional = Boolean(optional?.trim())
  const showServings = Boolean(servings?.trim())
  const showCategory = Boolean(category?.trim())
  const hasPhoto = Boolean(imageSrc?.trim())

  const optionalParagraphs = showOptional
    ? optional
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
    : []

  return (
    <article
      className="recipe-template"
      style={spacingStyle}
      data-name="Manrope with compoents"
      data-node-id="14:125"
    >
      {showCategory ? (
        <div className="recipe-template__category" data-node-id="14:163">
          <p className="recipe-template__category-text text-style-heading-2">
            {category}
          </p>
        </div>
      ) : null}

      <div className="recipe-template__card" data-node-id="14:169">
        <div className="recipe-template__body" data-node-id="54:242">
          <RecipeTitle title={displayTitle} subtitle={subtitle} />

          {showIngredients ? (
            <div className="recipe-template__list" data-node-id="14:140">
              {ingredients.map((ing, i) => (
                <RecipeItem
                  key={i}
                  quantity={ing.quantity}
                  unit={ing.unit}
                  name={ing.name}
                />
              ))}
            </div>
          ) : null}

          {showSteps ? (
            <ol className="recipe-template__list recipe-template__list--steps" data-node-id="51:372">
              {(() => {
                let stepNum = 0
                return steps.map((step, i) => {
                  if (isInstructionSectionHeader(step)) {
                    return (
                      <RecipeInstructionStep
                        key={i}
                        variant="header"
                        text={step}
                      />
                    )
                  }
                  stepNum += 1
                  return (
                    <RecipeInstructionStep key={i} index={stepNum} text={step} />
                  )
                })
              })()}
            </ol>
          ) : null}

          {showOptional ? (
            <div className="recipe-template__optional" data-node-id="51:649">
              {optionalParagraphs.map((para, i) => (
                <p key={i} className="text-style-instructions">
                  {para}
                </p>
              ))}
            </div>
          ) : null}

          {showServings ? (
            <p className="recipe-template__servings text-style-heading-2" data-node-id="49:62">
              {servings.toLowerCase().includes('serving') ? servings : `${servings} servings`}
            </p>
          ) : null}
        </div>

        {hasPhoto ? (
          <div className="recipe-template__image" data-node-id="54:245">
            <img
              src={imageSrc}
              alt=""
              className="recipe-template__image-photo"
            />
          </div>
        ) : null}
      </div>
    </article>
  )
}
