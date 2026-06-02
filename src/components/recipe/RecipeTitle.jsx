import React from 'react'

export default function RecipeTitle({ title, subtitle, showSubtitle = true }) {
  return (
    <div className="recipe-title-block">
      <h1 className="text-style-title recipe-title">{title}</h1>
      {showSubtitle && subtitle && (
        <p className="text-style-subtitle recipe-subtitle">{subtitle}</p>
      )}
    </div>
  )
}
