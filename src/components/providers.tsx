"use client"

import { useEffect, useState } from "react"
import { Provider } from "react-redux"
import { makeStore } from "@/lib/store"
import { hydrate, subscribePersist } from "@/lib/persistence"

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
      <div data-hydrated={ready} className="contents">
        {children}
      </div>
    </Provider>
  )
}
