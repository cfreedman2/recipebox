import { createContext, useCallback, useContext, useState } from 'react'

const STORAGE_KEY = 'recipe-box-unit-system'

/** @typedef {'imperial' | 'metric'} UnitSystem */

/**
 * @typedef {{ system: UnitSystem, toggle: () => void }} UnitSystemContextValue
 */

const UnitSystemContext = createContext(
  /** @type {UnitSystemContextValue} */ ({
    system: 'imperial',
    toggle: () => {},
  }),
)

/** @param {{ children: React.ReactNode }} props */
export function UnitSystemProvider({ children }) {
  const [system, setSystem] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored === 'metric' ? 'metric' : 'imperial'
    } catch {
      return 'imperial'
    }
  })

  const toggle = useCallback(() => {
    setSystem((prev) => {
      const next = prev === 'imperial' ? 'metric' : 'imperial'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {}
      return next
    })
  }, [])

  return (
    <UnitSystemContext.Provider value={{ system, toggle }}>
      {children}
    </UnitSystemContext.Provider>
  )
}

/** @returns {UnitSystemContextValue} */
export function useUnitSystem() {
  return useContext(UnitSystemContext)
}
