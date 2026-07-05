import { useUnitSystem } from '../context/UnitSystemContext'
import { FREE_RECIPE_LIMIT } from '../lib/billing'
import './NavBar.css'

/**
 * @param {{
 *   onNewRecipe: () => void,
 *   account?: {
 *     email: string,
 *     plan: 'free' | 'yearly',
 *     recipeCount: number,
 *     onUpgrade: () => void,
 *     onSignOut: () => void,
 *   } | null
 * }} props — account is null in local mode (no auth UI shown)
 */
export function NavBar({ onNewRecipe, account = null }) {
  const { system, toggle } = useUnitSystem()

  return (
    <header className="nav-bar">
      <a href="#recipes" className="nav-bar__brand">
        Recipes
      </a>
      <div className="nav-bar__actions">
        {account ? (
          account.plan === 'yearly' ? (
            <span className="nav-bar__plan nav-bar__plan--paid" title="Yearly plan — unlimited recipes">
              Unlimited
            </span>
          ) : (
            <button
              type="button"
              className="nav-bar__plan"
              onClick={account.onUpgrade}
              title="Free plan — click to upgrade"
            >
              {Math.min(account.recipeCount, FREE_RECIPE_LIMIT)} / {FREE_RECIPE_LIMIT} · Upgrade
            </button>
          )
        ) : null}
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
        {account ? (
          <button
            type="button"
            className="nav-bar__signout"
            onClick={account.onSignOut}
            title={`Signed in as ${account.email}`}
          >
            Sign Out
          </button>
        ) : null}
      </div>
    </header>
  )
}
