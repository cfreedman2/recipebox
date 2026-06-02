import React from 'react'

export default function RecipeRowNumber({ number }) {
  return (
    <span className="recipe-row-number text-style-step-number">
      {number}
    </span>
  )
}
