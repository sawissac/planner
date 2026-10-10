import {
  COLOR_THEME_PAIRS,
  COLOR_THEMES,
  type ColorTheme,
  type ColorThemeKey,
} from "@/lib/color-themes";

/**
 * Light-only view of the compacto-ui palette catalog. Planner has no dark
 * mode, so pickers and the theme applier only ever see the light side of each
 * hue pair.
 */

/** compacto-ui's default — `styles/compacto/tokens.css` mirrors it pre-hydration. */
export const DEFAULT_PALETTE: ColorThemeKey = "ocean-light";

/** Every light palette, labelled by hue, in compacto's picker order. */
export const LIGHT_PALETTES: { key: ColorThemeKey; label: string }[] = COLOR_THEME_PAIRS.flatMap(
  (pair) => (pair.light ? [{ key: pair.light, label: pair.label }] : []),
);

const LIGHT_KEYS = new Set<string>(LIGHT_PALETTES.map((p) => p.key));

/**
 * Resolve a stored palette key (`settings.accentColor`) to a light palette.
 * Unknown values — including the hex colours the old accent picker saved —
 * fall back to {@link DEFAULT_PALETTE}.
 */
export function resolvePalette(key: string | null | undefined): {
  key: ColorThemeKey;
  theme: ColorTheme;
} {
  const resolved = key && LIGHT_KEYS.has(key) ? (key as ColorThemeKey) : DEFAULT_PALETTE;
  return { key: resolved, theme: COLOR_THEMES[resolved] };
}
