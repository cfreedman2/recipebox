import React, { useRef, useEffect, useState } from 'react'
import './RecipeTemplate.css'
import RecipeTitle from './RecipeTitle.jsx'
import RecipeItem from './RecipeItem.jsx'
import RecipeInstructionStep from './RecipeInstructionStep.jsx'
import { calculateSpacing } from '../../lib/recipeSpacing.js'
import { applyUnitSystem } from '../../lib/recipeFormat.js'
import { parseInstructionsRaw } from '../../lib/recipeParser.js'

const PAGE_CONTENT_HEIGHT = 841 - 48 - 40 - 24 // page height minus padding minus border
const PAGE_WIDTH = 595

export default function RecipeTemplate({
  title,
  subtitle,
  category,
  ingredients = [],
  steps: stepsProp,
  instructions_raw,
  servings,
  dishPhoto,
  unitSystem = 'imperial'
}) {
  const spacing = calculateSpacing({ ingredients, steps: stepsProp || [] })

  // Resolve steps
  const steps = stepsProp && stepsProp.length > 0
    ? stepsProp
    : parseInstructionsRaw(instructions_raw)

  // Apply unit system to ingredients
  const convertedIngredients = applyUnitSystem(ingredients, unitSystem)

  // We do a simple layout: render all content on as many pages as needed
  // For simplicity, render on one page and let overflow handle it
  // A more advanced version would measure and paginate

  const imageHeight = spacing.imageHeight
  const innerPaddingTop = spacing.innerPaddingTop
  const innerPaddingBottom = spacing.innerPaddingBottom
  const sectionGap = spacing.sectionGap

  const innerStyle = {
    '--inner-padding-top': `${innerPaddingTop}px`,
    '--inner-padding-bottom': `${innerPaddingBottom}px`,
    '--section-gap': `${sectionGap}px`,
  }

  return (
    <div className="recipe-pages">
      <div className="recipe-page">
        <div className="recipe-page-inner" style={innerStyle}>
          {/* Category tag */}
          {category && (
            <div className="recipe-category-tag">
              <span>{category}</span>
            </div>
          )}

          {/* Content area */}
          <div className="recipe-content-area">
            {/* Title + subtitle */}
            <div className="recipe-title-block" style={{ marginBottom: sectionGap }}>
              <RecipeTitle title={title} subtitle={subtitle} showSubtitle={true} />
            </div>

            {/* Servings */}
            {servings && (
              <div className="recipe-meta" style={{ marginBottom: sectionGap }}>
                <p className="text-style-servings">{servings}</p>
              </div>
            )}

            {/* Ingredients */}
            {convertedIngredients.length > 0 && (
              <div className="recipe-section" style={{ marginBottom: sectionGap }}>
                <p className="recipe-section-label text-style-heading2">Ingredients</p>
                <div className="recipe-ingredients-list">
                  {convertedIngredients.map((ing, i) => (
                    <RecipeItem
                      key={i}
                      quantity={ing.quantity}
                      unit={ing.unit}
                      name={ing.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {steps.length > 0 && (
              <div className="recipe-section" style={{ marginBottom: sectionGap }}>
                <p className="recipe-section-label text-style-heading2">Instructions</p>
                <div className="recipe-instructions-list">
                  {steps.map((step, i) => (
                    <RecipeInstructionStep key={i} number={i + 1} text={step} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dish photo at the bottom of last page */}
          {dishPhoto && (
            <div
              className="recipe-dish-photo"
              style={{ height: imageHeight }}
            >
              {typeof dishPhoto === 'string' ? (
                <img src={dishPhoto} alt={title} />
              ) : (
                <div className="recipe-dish-photo-placeholder" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
