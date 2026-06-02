import React from 'react'
import RecipeRowNumber from './RecipeRowNumber.jsx'

export default function RecipeInstructionStep({ number, text }) {
  return (
    <div className="recipe-instruction-step">
      <RecipeRowNumber number={number} />
      <p className="recipe-instruction-text text-style-instructions">{text}</p>
    </div>
  )
}
