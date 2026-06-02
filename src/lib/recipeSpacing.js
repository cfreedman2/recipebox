export function calculateSpacing(recipe) {
  const ingredientCount = recipe?.ingredients?.length || 0
  const stepCount = recipe?.steps?.length || 0
  const total = ingredientCount + stepCount

  // Dynamic spacing based on content density
  // More content = tighter spacing
  const sectionGap = total > 20 ? 16 : total > 12 ? 24 : 32
  const imageHeight = total > 20 ? 100 : total > 12 ? 150 : 200
  const innerPaddingTop = total > 20 ? 32 : total > 12 ? 40 : 56
  const innerPaddingBottom = total > 20 ? 16 : total > 12 ? 24 : 32

  return {
    sectionGap,
    imageHeight,
    innerPaddingTop,
    innerPaddingBottom
  }
}
