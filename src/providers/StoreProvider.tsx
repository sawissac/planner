"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Provider } from "react-redux";

import { ConfirmProvider } from "@/components/customs/ConfirmDialog";
import { subscribeCloudSync } from "@/lib/cloud-sync";
import { appThemeCssVars } from "@/lib/color-themes";
import { resolvePalette } from "@/lib/palette";
import { hydrate, subscribePersist } from "@/lib/persistence";
import { useAppSelector } from "@/stores/hooks";
import { makeStore } from "@/stores/store";

export const HydrationContext = createContext(false);
export const useHydrated = () => useContext(HydrationContext);

/**
 * Paints the active compacto-ui palette (`settings.accentColor` holds its key)
 * onto the root element as `--app-*` variables. Light palettes only — the
 * `.dark` class is never set.
 */
function ThemeApplier() {
  const paletteKey = useAppSelector((s) => s.settings.accentColor);
  useEffect(() => {
    const root = document.documentElement;
    const { theme } = resolvePalette(paletteKey);
    for (const [name, value] of Object.entries(appThemeCssVars(theme))) {
      root.style.setProperty(name, value);
    }
  }, [paletteKey]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [store] = useState(makeStore);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsubPersist: (() => void) | null = null;
    let unsubCloud: (() => void) | null = null;
    let cancelled = false;
    hydrate(store).finally(() => {
      if (cancelled) {
        return;
      }
      unsubPersist = subscribePersist(store);
      unsubCloud = subscribeCloudSync(store);
      setReady(true);
    });
    return () => {
      cancelled = true;
      if (unsubPersist) {
        unsubPersist();
      }
      if (unsubCloud) {
        unsubCloud();
      }
    };
  }, [store]);

  return (
    <Provider store={store}>
      <HydrationContext.Provider value={ready}>
        <ThemeApplier />
        <ConfirmProvider>
          <div data-hydrated={ready} className="contents">
            {children}
          </div>
        </ConfirmProvider>
      </HydrationContext.Provider>
    </Provider>
  );
}
