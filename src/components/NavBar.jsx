import React from 'react'

export default function NavBar({ onNewRecipe, unitSystem, onToggleUnit }) {
  function scrollToRecipes() {
    const el = document.getElementById('recipe-list')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav style={styles.nav}>
      <button style={styles.recipesLink} onClick={scrollToRecipes}>
        Recipes
      </button>
      <div style={styles.right}>
        <button
          style={styles.unitToggle}
          onClick={onToggleUnit}
          title="Toggle unit system"
        >
          {unitSystem === 'imperial' ? 'Imperial' : 'Metric'}
        </button>
        <button style={styles.newBtn} onClick={onNewRecipe}>
          + New Recipe
        </button>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    borderBottom: '1px solid rgba(0,0,0,0.1)',
    background: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  recipesLink: {
    background: 'none',
    border: 'none',
    fontFamily: 'Manrope, sans-serif',
    fontWeight: 400,
    fontSize: 14,
    cursor: 'pointer',
    padding: '4px 0',
    color: '#000',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  unitToggle: {
    background: 'none',
    border: '1px solid rgba(0,0,0,0.2)',
    fontFamily: 'Manrope, sans-serif',
    fontWeight: 400,
    fontSize: 12,
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: 4,
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  newBtn: {
    background: '#000',
    color: '#fff',
    border: 'none',
    fontFamily: 'Manrope, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: 4,
  },
}
