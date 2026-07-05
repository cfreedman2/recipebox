import { useCallback, useEffect, useState } from 'react'
import { NavBar } from './components/NavBar'
import { RecipeScrollView } from './components/RecipeScrollView'
import { NewRecipeModal } from './components/NewRecipeModal'
import { UnitSystemProvider } from './context/UnitSystemContext'
import {
  fetchRecipes,
  insertRecipes,
  updateRecipe,
  deleteRecipe,
  collectCategoriesFromRecipes,
} from './lib/recipes'
import { DEFAULT_CATEGORIES } from './lib/categories'

function extraCategoriesFromList(all) {
  return all.filter((c) => !DEFAULT_CATEGORIES.includes(c))
}

function App() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [extraCategories, setExtraCategories] = useState([])

  const loadRecipes = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchRecipes()
      setRecipes(data)
      setExtraCategories(
        extraCategoriesFromList(await collectCategoriesFromRecipes(data)),
      )
    } catch (err) {
      setLoadError(err.message ?? 'Failed to load recipes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  const handleSaveParsed = async (parsed) => {
    const saved = await insertRecipes(parsed)
    setRecipes((prev) => [...prev, ...saved])
    setExtraCategories((prev) =>
      extraCategoriesFromList([
        ...prev,
        ...saved.map((r) => r.category),
      ]),
    )
    return saved
  }

  const handleUpdateRecipe = async (updated) => {
    const saved = await updateRecipe(updated)
    setRecipes((prev) => prev.map((r) => (r.id === saved.id ? saved : r)))
    return saved
  }

  const handleDeleteRecipe = async (recipeId) => {
    await deleteRecipe(recipeId)
    setRecipes((prev) => {
      const next = prev.filter((r) => r.id !== recipeId)
      setExtraCategories(extraCategoriesFromList(next.map((r) => r.category)))
      return next
    })
  }

  const handleCreated = (saved) => {
    requestAnimationFrame(() => {
      const last = saved[saved.length - 1]
      if (last?.id) {
        document.getElementById(`recipe-${last.id}`)?.scrollIntoView({
          behavior: 'smooth',
        })
      }
    })
  }

  return (
    <UnitSystemProvider>
      <NavBar onNewRecipe={() => setModalOpen(true)} />
      {loadError ? (
        <p className="app-error" role="alert">
          {loadError}
        </p>
      ) : null}
      <RecipeScrollView
        recipes={recipes}
        loading={loading}
        extraCategories={extraCategories}
        onUpdateRecipe={handleUpdateRecipe}
        onDeleteRecipe={handleDeleteRecipe}
      />
      <NewRecipeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        onSave={handleSaveParsed}
        extraCategories={extraCategories}
      />
    </UnitSystemProvider>
  )
}

export default App
