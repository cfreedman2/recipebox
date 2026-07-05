import { useCallback, useEffect, useState } from 'react'
import { NavBar } from './components/NavBar'
import { RecipeScrollView } from './components/RecipeScrollView'
import { NewRecipeModal } from './components/NewRecipeModal'
import { AuthScreen } from './components/AuthScreen'
import { UpgradeModal } from './components/UpgradeModal'
import { UnitSystemProvider } from './context/UnitSystemContext'
import {
  fetchRecipes,
  insertRecipes,
  updateRecipe,
  deleteRecipe,
  collectCategoriesFromRecipes,
} from './lib/recipes'
import { isAuthEnabled, getSession, onAuthChange, signOut } from './lib/auth'
import {
  getPlanStatus,
  isBillingAvailable,
  isFreeLimitError,
  FREE_RECIPE_LIMIT,
} from './lib/billing'
import { DEFAULT_CATEGORIES } from './lib/categories'

function extraCategoriesFromList(all) {
  return all.filter((c) => !DEFAULT_CATEGORIES.includes(c))
}

function App() {
  const authEnabled = isAuthEnabled()

  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [extraCategories, setExtraCategories] = useState([])

  // Auth state: undefined = still checking, null = signed out
  const [session, setSession] = useState(authEnabled ? undefined : null)
  const [recoveryMode, setRecoveryMode] = useState(false)

  // Billing state
  const [plan, setPlan] = useState(/** @type {'free' | 'yearly'} */ ('free'))
  const [billingEnabled, setBillingEnabled] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [checkoutNotice, setCheckoutNotice] = useState('')

  useEffect(() => {
    if (!authEnabled) return undefined
    let unsubscribe = () => {}
    getSession()
      .then(setSession)
      .catch(() => setSession(null))
    onAuthChange((nextSession, event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      setSession(nextSession)
    }).then((fn) => {
      unsubscribe = fn
    })
    return () => unsubscribe()
  }, [authEnabled])

  // Returning from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      setCheckoutNotice(
        'Payment received — your yearly plan activates within a few seconds. Thanks!',
      )
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const signedIn = !authEnabled || Boolean(session)

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
    if (!signedIn) return
    loadRecipes()
    if (authEnabled) {
      getPlanStatus()
        .then((status) => setPlan(status.plan))
        .catch(() => {})
      isBillingAvailable().then(setBillingEnabled)
    }
  }, [signedIn, authEnabled, loadRecipes])

  const handleSaveParsed = async (parsed) => {
    try {
      const saved = await insertRecipes(parsed)
      setRecipes((prev) => [...prev, ...saved])
      setExtraCategories((prev) =>
        extraCategoriesFromList([
          ...prev,
          ...saved.map((r) => r.category),
        ]),
      )
      return saved
    } catch (err) {
      if (isFreeLimitError(err)) {
        setModalOpen(false)
        setUpgradeOpen(true)
        throw new Error(
          `The free plan includes ${FREE_RECIPE_LIMIT} recipes. Upgrade to the yearly plan to add more.`,
        )
      }
      throw err
    }
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

  if (authEnabled && session === undefined) {
    return null // checking the stored session — avoids a sign-in flash
  }

  if (authEnabled && (!session || recoveryMode)) {
    return (
      <AuthScreen
        recoveryMode={recoveryMode}
        onRecoveryDone={() => setRecoveryMode(false)}
      />
    )
  }

  const account =
    authEnabled && session
      ? {
          email: session.user?.email ?? '',
          plan,
          recipeCount: recipes.length,
          onUpgrade: () => setUpgradeOpen(true),
          onSignOut: () => {
            signOut().catch(() => {})
            setRecipes([])
          },
        }
      : null

  return (
    <UnitSystemProvider>
      <NavBar onNewRecipe={() => setModalOpen(true)} account={account} />
      {checkoutNotice ? (
        <p className="app-notice" role="status">
          {checkoutNotice}{' '}
          <button type="button" onClick={() => setCheckoutNotice('')}>
            Dismiss
          </button>
        </p>
      ) : null}
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
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        recipeCount={recipes.length}
        billingEnabled={billingEnabled}
      />
    </UnitSystemProvider>
  )
}

export default App
