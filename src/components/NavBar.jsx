import { useUnitSystem } from '../context/UnitSystemContext'
import './NavBar.css'

export function NavBar({ onNewRecipe }) {
  const { system, toggle } = useUnitSystem()

  return (
    <header className="nav-bar">
      <a href="#recipes" className="nav-bar__brand">
        Recipes
      </a>
      <div className="nav-bar__actions">
        <button
          type="button"
          className="nav-bar__unit-toggle"
          onClick={toggle}
          title={system === 'imperial' ? 'Switch to metric (g, kg)' : 'Switch to imperial (oz, lb)'}
        >
          {system === 'imperial' ? 'oz / lb' : 'g / kg'}
        </button>
        <button type="button" className="nav-bar__new" onClick={onNewRecipe}>
          + New Recipe
        </button>
      </div>
    </header>
  )
}
