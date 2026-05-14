"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { Provider } from "react-redux"
import { makeStore } from "@/lib/store"
import { hydrate, subscribePersist } from "@/lib/persistence"
import { useAppSelector } from "@/lib/hooks"

export const HydrationContext = createContext(false)
export const useHydrated = () => useContext(HydrationContext)

function ThemeApplier() {
  const darkMode = useAppSelector((s) => s.settings.darkMode)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode)
  }, [darkMode])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [store] = useState(makeStore)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let unsub: (() => void) | null = null
    let cancelled = false
    hydrate(store).finally(() => {
      if (cancelled) return
      unsub = subscribePersist(store)
      setReady(true)
    })
    return () => {
      cancelled = true
      if (unsub) unsub()
    }
  }, [store])

  return (
    <Provider store={store}>
      <HydrationContext.Provider value={ready}>
        <ThemeApplier />
        <div data-hydrated={ready} className="contents">
          {children}
        </div>
      </HydrationContext.Provider>
    </Provider>
  )
}
