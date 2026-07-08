"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHydrated } from "@/providers/StoreProvider";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { setDarkMode } from "@/stores/slices/settingsSlice";

/**
 * Light/dark theme toggle — an icon button flipping `settings.darkMode`.
 *
 * The icon stays on its default (Moon) until the Redux store has hydrated
 * from local storage, so the first client render matches SSR — no hydration
 * mismatch.
 *
 * @param props.className - Extra classes for the trigger button.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector((s) => s.settings.darkMode);
  const hydrated = useHydrated();
  const showSun = hydrated && darkMode;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={showSun ? "Light mode" : "Dark mode"}
      title={showSun ? "Light mode" : "Dark mode"}
      onClick={() => dispatch(setDarkMode(!darkMode))}
      className={className}
    >
      {showSun ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
