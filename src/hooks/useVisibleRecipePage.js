import { useEffect, useState } from 'react'

/**
 * Tracks which paginated page (`data-page-index`) is most visible inside a recipe section.
 *
 * @param {React.RefObject<HTMLElement | null>} sectionRef
 * @param {number} pageCount — re-attach observers when pagination changes
 * @returns {number | null}
 */
export function useVisibleRecipePage(sectionRef, pageCount) {
  const [visiblePageIndex, setVisiblePageIndex] = useState(/** @type {number | null} */ (null))

  useEffect(() => {
    const root = sectionRef.current
    if (!root || pageCount < 1) {
      setVisiblePageIndex(null)
      return
    }

    const ratios = new Map()

    function pickVisible() {
      const list = Array.from(
        root.querySelectorAll('.recipe-template[data-page-index]'),
      )
      if (!list.length) return

      let best = list[0]
      let bestRatio = ratios.get(best) ?? 0

      for (const el of list) {
        const ratio = ratios.get(el) ?? 0
        if (ratio > bestRatio) {
          best = el
          bestRatio = ratio
        }
      }

      const idx = best.getAttribute('data-page-index')
      const next = idx != null ? Number.parseInt(idx, 10) : 0
      setVisiblePageIndex((prev) => (prev === next ? prev : next))
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.intersectionRatio)
        }
        pickVisible()
      },
      { root: null, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    )

    ratios.clear()
    const list = Array.from(
      root.querySelectorAll('.recipe-template[data-page-index]'),
    )
    for (const el of list) {
      observer.observe(el)
    }

    if (list.length) {
      pickVisible()
    } else {
      setVisiblePageIndex(0)
    }

    return () => observer.disconnect()
  }, [sectionRef, pageCount])

  return visiblePageIndex
}
