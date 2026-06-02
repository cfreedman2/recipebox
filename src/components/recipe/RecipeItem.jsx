import React from 'react'

export default function RecipeItem({ quantity, unit, name }) {
  const measurementText = [quantity, unit].filter(Boolean).join(' ')
  return (
    <p className="recipe-item__text text-style-ingredients">
      {measurementText && (
        <span className="measurement">{measurementText} </span>
      )}
      {name}
    </p>
  )
}
