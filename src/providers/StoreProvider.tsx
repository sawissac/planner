"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Provider } from "react-redux";

import { subscribeDriveSync } from "@/lib/drive-sync";
import { hydrate, subscribePersist } from "@/lib/persistence";
import { useAppSelector } from "@/stores/hooks";
import { makeStore } from "@/stores/store";

export const HydrationContext = createContext(false);
export const useHydrated = () => useContext(HydrationContext);

function hexToOklch(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    return null;
  }
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
}

function ThemeApplier() {
  const darkMode = useAppSelector((s) => s.settings.darkMode);
  const accent = useAppSelector((s) => s.settings.accentColor);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);
  useEffect(() => {
    const root = document.documentElement;
    if (!accent) {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--chart-4");
      return;
    }
    const value = hexToOklch(accent);
    if (!value) {
      return;
    }
    root.style.setProperty("--primary", value);
    root.style.setProperty("--ring", value);
    root.style.setProperty("--sidebar-primary", value);
    root.style.setProperty("--chart-4", value);
  }, [accent]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [store] = useState(makeStore);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsubPersist: (() => void) | null = null;
    let unsubDrive: (() => void) | null = null;
    let cancelled = false;
    hydrate(store).finally(() => {
      if (cancelled) {
        return;
      }
      unsubPersist = subscribePersist(store);
      unsubDrive = subscribeDriveSync(store);
      setReady(true);
    });
    return () => {
      cancelled = true;
      if (unsubPersist) {
        unsubPersist();
      }
      if (unsubDrive) {
        unsubDrive();
      }
    };
  }, [store]);

  return (
    <Provider store={store}>
      <HydrationContext.Provider value={ready}>
        <ThemeApplier />
        <div data-hydrated={ready} className="contents">
          {children}
        </div>
      </HydrationContext.Provider>
    </Provider>
  );
}
