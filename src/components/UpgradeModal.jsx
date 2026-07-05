import { useState } from 'react'
import { startCheckout, FREE_RECIPE_LIMIT } from '../lib/billing'
import './NewRecipeModal.css'

/**
 * Shown when the free plan's recipe limit is reached (or via the Upgrade
 * button). Sends the user to Stripe Checkout for the yearly plan.
 *
 * @param {{ open: boolean, onClose: () => void, recipeCount: number, billingEnabled: boolean }} props
 */
export function UpgradeModal({ open, onClose, recipeCount, billingEnabled }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function handleUpgrade() {
    setError('')
    setLoading(true)
    try {
      await startCheckout() // redirects to Stripe on success
    } catch (err) {
      setError(err.message ?? 'Could not start checkout')
      setLoading(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-labelledby="upgrade-title">
        <header className="modal__header">
          <h2 id="upgrade-title">Upgrade to Unlimited</h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="modal__form">
          <p>
            The free plan includes {FREE_RECIPE_LIMIT} recipes — you have{' '}
            {Math.min(recipeCount, FREE_RECIPE_LIMIT)} of {FREE_RECIPE_LIMIT}.
            The yearly plan removes the limit so your whole collection lives in
            one box.
          </p>
          <p>
            Payment is handled securely by Stripe — your card details never
            touch this app's servers.
          </p>

          {!billingEnabled ? (
            <p className="modal__error">
              Billing is not configured yet. Set STRIPE_SECRET_KEY and
              STRIPE_PRICE_ID in .env (see README) to enable checkout.
            </p>
          ) : null}
          {error ? <p className="modal__error">{error}</p> : null}

          <footer className="modal__footer">
            <button
              type="button"
              className="modal__btn modal__btn--secondary"
              onClick={onClose}
              disabled={loading}
            >
              Not Now
            </button>
            <button
              type="button"
              className="modal__btn modal__btn--primary"
              onClick={handleUpgrade}
              disabled={loading || !billingEnabled}
            >
              {loading ? 'Opening Stripe…' : 'Upgrade — Yearly Plan'}
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}
