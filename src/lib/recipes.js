const STORAGE_KEY = 'recipebox-recipes'

export function loadRecipes() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveRecipe(recipe) {
  const recipes = loadRecipes()
  const id = recipe.id || `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const newRecipe = { ...recipe, id }
  const existing = recipes.findIndex(r => r.id === id)
  if (existing >= 0) {
    recipes[existing] = newRecipe
  } else {
    recipes.push(newRecipe)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  return newRecipe
}

export function deleteRecipe(id) {
  const recipes = loadRecipes().filter(r => r.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
}
