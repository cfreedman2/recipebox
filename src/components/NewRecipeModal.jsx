import { useEffect, useState } from 'react'
import { parseRecipeText } from '../lib/parseRecipeText'
import { parseRecipePhotos, getPhotoUploadStatus } from '../lib/parseRecipePhotos'
import { parseRecipes } from '../lib/api'
import { convertApiRecipes } from '../lib/convertApiRecipe'
import './NewRecipeModal.css'

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onCreated: (recipes: import('../lib/recipes').RecipeRecord[]) => void,
 *   extraCategories: string[],
 *   onSave: (parsed: import('../lib/recipes').ParsedRecipe[]) => Promise<import('../lib/recipes').RecipeRecord[]>
 * }} props
 */
export function NewRecipeModal({
  open,
  onClose,
  onCreated,
  extraCategories,
  onSave,
}) {
  const [tab, setTab] = useState('text')
  const [text, setText] = useState('')
  const [photoFiles, setPhotoFiles] = useState(/** @type {File[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [photoStatus, setPhotoStatus] = useState({
    ready: false,
    message: 'Checking…',
  })

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getPhotoUploadStatus().then((s) => {
      if (!cancelled) setPhotoStatus(s)
    })
    return () => {
      cancelled = true
    }
  }, [open, tab])

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)
    setProgress('')

    try {
      /** @type {import('../lib/recipes').ParsedRecipe[]} */
      let parsed = []

      if (tab === 'text') {
        if (!text.trim()) {
          setError('Paste some recipe text first.')
          setLoading(false)
          return
        }

        try {
          const apiRecipes = await parseRecipes({
            type: 'text',
            text,
            extraCategories,
          })
          parsed = convertApiRecipes(apiRecipes)
          setNotice('Recipe formatted with AI.')
        } catch {
          parsed = parseRecipeText(text, extraCategories)
        }
      } else {
        if (!photoFiles.length) {
          setError('Choose at least one image.')
          setLoading(false)
          return
        }

        if (!photoStatus.ready) {
          setError(photoStatus.message)
          setLoading(false)
          return
        }

        const { recipes, imageRoles, uncertainMarkers } = await parseRecipePhotos(
          photoFiles,
          extraCategories,
          setProgress,
        )
        parsed = recipes

        const pageCount = imageRoles.filter((r) => r === 'recipe_page').length
        const hasDish = imageRoles.some((r) => r === 'food_photo')
        const parts = []
        if (pageCount > 0) {
          parts.push(
            `${pageCount} recipe page${pageCount > 1 ? 's' : ''} combined into one card`,
          )
        }
        if (hasDish) parts.push('dish photo added to the card')
        else if (pageCount > 0) parts.push('no dish photo detected')
        if (uncertainMarkers > 0) {
          parts.push(
            `${uncertainMarkers} unclear reading${uncertainMarkers > 1 ? 's' : ''} marked with ? — please review quantities and wording`,
          )
        }
        setNotice(parts.length ? parts.join('; ') + '.' : 'Recipe added.')
      }

      if (!parsed.length) {
        setError('No recipes could be extracted.')
        setLoading(false)
        return
      }

      const saved = await onSave(parsed)
      onCreated(saved)
      setText('')
      setPhotoFiles([])
      onClose()
    } catch (err) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  function handleBackdrop(e) {
    if (e.target === e.currentTarget && !loading) onClose()
  }

  const submitDisabled =
    loading || (tab === 'images' && (!photoStatus.ready || !photoFiles.length))

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={handleBackdrop}
      onKeyDown={() => {}}
    >
      <div className="modal" role="dialog" aria-labelledby="new-recipe-title">
        <header className="modal__header">
          <h2 id="new-recipe-title">New Recipe</h2>
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
            className={tab === 'text' ? 'modal__tab modal__tab--active' : 'modal__tab'}
            onClick={() => setTab('text')}
            disabled={loading}
          >
            Paste Text
          </button>
          <button
            type="button"
            className={
              tab === 'images' ? 'modal__tab modal__tab--active' : 'modal__tab'
            }
            onClick={() => setTab('images')}
            disabled={loading}
          >
            Upload Photo(s)
          </button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit}>
          {tab === 'text' ? (
            <label className="modal__field">
              <span className="modal__label">
                Paste a recipe with a title, ingredients, and instructions.
              </span>
              <textarea
                className="modal__textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={14}
                disabled={loading}
                placeholder={
                  'PENNE À LA VODKA\nDairy\n\n1 (16-ounce) package penne pasta\n...\n\nCook the pasta...\n\nYield: 6 to 8 servings.'
                }
              />
            </label>
          ) : (
            <label className="modal__field">
              <span className="modal__label">
                Upload one or more images in a single batch. AI sorts each
                image as a <strong>recipe page</strong> (text is read and
                combined if the recipe spans several pages) or a{' '}
                <strong>dish photo</strong> (finished food for the bottom of the
                card). Recipe scans are never shown on the card.
              </span>
              <p
                className={
                  photoStatus.ready
                    ? 'modal__photo-status modal__photo-status--ready'
                    : 'modal__photo-status modal__photo-status--off'
                }
                role="status"
              >
                {photoStatus.message}
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={loading || !photoStatus.ready}
                onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
              />
              {photoFiles.length > 0 ? (
                <p className="modal__files">
                  {photoFiles.length} image{photoFiles.length > 1 ? 's' : ''}{' '}
                  selected
                </p>
              ) : null}
            </label>
          )}

          {progress ? <p className="modal__progress">{progress}</p> : null}
          {notice ? <p className="modal__notice">{notice}</p> : null}
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
              disabled={tab === 'images' ? submitDisabled : loading}
            >
              {loading ? 'Working…' : 'Add Recipe(s)'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
