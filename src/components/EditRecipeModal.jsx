import { useEffect, useState } from 'react'
import { createRecipeCardImageDataUrl } from '../lib/imageUtils'
import { withDishImageFields } from '../lib/recipeImageCleanup'
import { RECIPE_IMAGE_ASPECT } from '../lib/recipeImageConstants'
import './NewRecipeModal.css'

/**
 * @param {{
 *   open: boolean,
 *   recipe: import('../lib/recipes').RecipeRecord | null,
 *   extraCategories: string[],
 *   onClose: () => void,
 *   onSave: (updated: import('../lib/recipes').RecipeRecord) => Promise<void>,
 * }} props
 */
export function EditRecipeModal({ open, recipe, onClose, onSave }) {
  const [tab, setTab] = useState('photo')
  const [subtitle, setSubtitle] = useState('')
  const [servings, setServings] = useState('')
  const [optional, setOptional] = useState('')
  const [removeImage, setRemoveImage] = useState(false)
  const [dishFile, setDishFile] = useState(/** @type {File | null} */ (null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !recipe) return
    setTab('photo')
    setSubtitle(recipe.subtitle ?? '')
    setServings(recipe.servings ?? '')
    setOptional(recipe.optional ?? '')
    setRemoveImage(false)
    setDishFile(null)
    setError('')
  }, [open, recipe])

  if (!open || !recipe) return null

  const hasExistingImage = Boolean(recipe.imageSrc?.trim() && recipe.imageKind === 'dish')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let imageSrc = recipe.imageSrc ?? ''
      let imageKind = recipe.imageKind ?? ''

      if (tab === 'photo') {
        if (removeImage) {
          imageSrc = ''
          imageKind = ''
        } else if (dishFile) {
          imageSrc = await createRecipeCardImageDataUrl(dishFile, {
            isDedicatedFoodPhoto: true,
            focalX: 0.5,
            focalY: 0.5,
            targetAspect: RECIPE_IMAGE_ASPECT,
            maxWidth: 1800,
          })
          imageKind = 'dish'
        }
      }

      const updated = withDishImageFields({
        ...recipe,
        subtitle: subtitle.trim(),
        servings: servings.trim(),
        optional: optional.trim(),
        imageSrc,
        imageKind,
      })

      await onSave(updated)
      onClose()
    } catch (err) {
      setError(err.message ?? 'Could not save changes')
    } finally {
      setLoading(false)
    }
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget && !loading) onClose()
  }

  const photoChanged = removeImage || Boolean(dishFile)

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={handleBackdrop}
    >
      <div className="modal" role="dialog" aria-labelledby="edit-recipe-title">
        <header className="modal__header">
          <h2 id="edit-recipe-title">Add details</h2>
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

        <div className="modal__tabs">
          <button
            type="button"
            className={tab === 'photo' ? 'modal__tab modal__tab--active' : 'modal__tab'}
            onClick={() => setTab('photo')}
            disabled={loading}
          >
            Dish photo
          </button>
          <button
            type="button"
            className={
              tab === 'details' ? 'modal__tab modal__tab--active' : 'modal__tab'
            }
            onClick={() => setTab('details')}
            disabled={loading}
          >
            Recipe details
          </button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit}>
          {tab === 'photo' ? (
            <label className="modal__field">
              <span className="modal__label">
                Attach a photo of the finished dish. It appears at the bottom of the
                recipe card — not recipe scans or cookbook pages.
              </span>
              {hasExistingImage && !dishFile && !removeImage ? (
                <p className="modal__files">A dish photo is already on this recipe.</p>
              ) : null}
              <input
                type="file"
                accept="image/*"
                disabled={loading}
                onChange={(e) => {
                  setDishFile(e.target.files?.[0] ?? null)
                  setRemoveImage(false)
                }}
              />
              {dishFile ? (
                <p className="modal__files">1 image selected</p>
              ) : null}
              {hasExistingImage ? (
                <label className="modal__checkbox">
                  <input
                    type="checkbox"
                    checked={removeImage}
                    onChange={(e) => {
                      setRemoveImage(e.target.checked)
                      if (e.target.checked) setDishFile(null)
                    }}
                    disabled={loading}
                  />
                  Remove dish photo
                </label>
              ) : null}
            </label>
          ) : (
            <>
              <label className="modal__field">
                <span className="modal__label">
                  Description / intro (optional)
                </span>
                <textarea
                  className="modal__textarea"
                  rows={4}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  disabled={loading}
                  placeholder="A short intro or story about the dish…"
                />
              </label>

              <label className="modal__field">
                <span className="modal__label">Servings (optional)</span>
                <input
                  type="text"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  placeholder="e.g. 6 to 8 servings"
                  disabled={loading}
                />
              </label>

              <label className="modal__field">
                <span className="modal__label">Notes (optional)</span>
                <textarea
                  className="modal__textarea"
                  rows={3}
                  value={optional}
                  onChange={(e) => setOptional(e.target.value)}
                  disabled={loading}
                  placeholder="Cook time, make-ahead tips, substitutions…"
                />
              </label>
            </>
          )}

          {error ? <p className="modal__error">{error}</p> : null}

          <footer className="modal__footer">
            <button
              type="button"
              className="modal__btn modal__btn--secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal__btn modal__btn--primary"
              disabled={loading || (tab === 'photo' && !photoChanged)}
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
