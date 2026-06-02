import React, { useState, useEffect } from 'react'
import NavBar from './components/NavBar.jsx'
import NewRecipeModal from './components/NewRecipeModal.jsx'
import RecipeTemplate from './components/recipe/RecipeTemplate.jsx'
import { loadRecipes, saveRecipe, deleteRecipe } from './lib/recipes.js'
import { pestoSalmonDemo } from './data/pestoSalmonDemo.js'

const UNIT_KEY = 'recipebox-unit-system'

function loadUnitSystem() {
  try {
    return localStorage.getItem(UNIT_KEY) || 'imperial'
  } catch {
    return 'imperial'
  }
}

function saveUnitSystem(system) {
  try {
    localStorage.setItem(UNIT_KEY, system)
  } catch {}
}

export default function App() {
  const [recipes, setRecipes] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [unitSystem, setUnitSystem] = useState(loadUnitSystem)

  useEffect(() => {
    let stored = loadRecipes()
    // Seed demo recipe if no recipes exist
    if (stored.length === 0) {
      saveRecipe(pestoSalmonDemo)
      stored = [pestoSalmonDemo]
    }
    setRecipes(stored)
  }, [])

  function handleToggleUnit() {
    const next = unitSystem === 'imperial' ? 'metric' : 'imperial'
    setUnitSystem(next)
    saveUnitSystem(next)
  }

  function handleSaveRecipe(recipe) {
    const saved = saveRecipe(recipe)
    setRecipes(loadRecipes())
  }

  function handleDeleteRecipe(id) {
    deleteRecipe(id)
    setRecipes(loadRecipes())
  }

  return (
    <div style={styles.app}>
      <NavBar
        onNewRecipe={() => setShowModal(true)}
        unitSystem={unitSystem}
        onToggleUnit={handleToggleUnit}
      />

      <main style={styles.main} id="recipe-list">
        {recipes.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>No recipes yet. Add one to get started.</p>
          </div>
        ) : (
          <div style={styles.recipeGrid}>
            {recipes.map(recipe => (
              <div key={recipe.id} style={styles.recipeWrapper}>
                <RecipeTemplate
                  {...recipe}
                  unitSystem={unitSystem}
                />
                <div style={styles.recipeActions}>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDeleteRecipe(recipe.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <NewRecipeModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveRecipe}
        />
      )}
    </div>
  )
}

const styles = {
  app: {
    minHeight: '100vh',
    background: '#f9f9f9',
    fontFamily: 'Manrope, sans-serif',
  },
  main: {
    padding: '40px 32px',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyText: {
    fontFamily: 'Manrope, sans-serif',
    fontSize: 14,
    color: '#999',
  },
  recipeGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 40,
    justifyContent: 'flex-start',
  },
  recipeWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  recipeActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  deleteBtn: {
    background: 'none',
    border: '1px solid rgba(0,0,0,0.15)',
    fontFamily: 'Manrope, sans-serif',
    fontSize: 11,
    cursor: 'pointer',
    padding: '4px 10px',
    borderRadius: 3,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
}
