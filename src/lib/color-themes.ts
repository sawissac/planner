/**
 * Color theme catalog — the runtime palettes behind the `--app-*` token
 * vocabulary.
 *
 * Each {@link ColorTheme} is a complete, self-contained palette — background,
 * three surface elevations, one accent, and text — rather than a `light` /
 * `dark` binary layered on top of a fixed accent. Selecting a theme fully
 * determines the appearance (see {@link ColorTheme.isLight}); there is no
 * separate light/dark toggle.
 *
 * That is why no component class in this library carries a `dark:` variant.
 * A `dark:` clause would encode a second, parallel answer to a question the
 * palette has already answered, and the two would drift. The `.dark` class
 * still goes on the root element — {@link ColorTheme.isLight} decides — but
 * only so third-party CSS (Monaco, KaTeX, shiki) and the pre-hydration
 * defaults in `tokens.css` can key off it.
 *
 * Pure data plus one pure mapping function — no React, no framework.
 *
 * @example
 * ```ts
 * import { appThemeCssVars, COLOR_THEMES } from "@/lib/color-themes";
 *
 * const theme = COLOR_THEMES["midnight-dark"];
 * for (const [name, value] of Object.entries(appThemeCssVars(theme))) {
 *   document.documentElement.style.setProperty(name, value);
 * }
 * document.documentElement.classList.toggle("dark", !theme.isLight);
 * ```
 */

/** One named color theme. Set `isLight: true` on any theme that should paint the `.dark` root class off. */
export interface ColorTheme {
  isLight?: boolean;
  /** Page background (the deepest surface). */
  bg: string;
  /** Card / popover surface — one step up from `bg`. */
  bgPanel: string;
  /** Sidebar / secondary / muted surface — a third distinct tone. */
  bgSidebar: string;
  /** Subtle hover wash (translucent — composites over whatever's beneath). */
  bgHover: string;
  /** Selected/active row wash (translucent). */
  bgSelected: string;
  /** Hairline border. */
  border: string;
  /** Slightly stronger border (inputs, dividers that need more presence). */
  borderMid: string;
  /** Accent-tinted border (focus rings, active outlines). */
  borderAccent: string;
  /** The theme's single accent hue. */
  accent: string;
  /** Accent at ~55% — dimmed accent text/icons. */
  accentDim: string;
  /** Accent at ~8-14% — faint accent washes. */
  accentFaint: string;
  /** Default body text. */
  text: string;
  /** High-contrast text (headings, emphasis). */
  textBright: string;
  /** De-emphasized text (captions, placeholders). */
  textDim: string;
  /** Code-surface background (editor / highlighted code blocks). */
  editorBg: string;
  /** Code gutter background (line numbers). */
  gutterBg: string;
  success: string;
  warn: string;
  error: string;
}

export type ColorThemeKey =
  | "midnight-dark"
  | "midnight-light"
  | "ocean-dark"
  | "ocean-light"
  | "light"
  | "purple-dark"
  | "purple-light"
  | "green-dark"
  | "green-light"
  | "rose-dark"
  | "rose-light"
  | "amber-dark"
  | "amber-light"
  | "slate-dark"
  | "slate-light"
  | "flat-dark"
  | "flat-light"
  | "coffee-dark"
  | "coffee-light"
  | "cyberpunk-dark"
  | "cyberpunk-light"
  | "retro-dark"
  | "retro-light";

/** Display order for pickers — stable picker order, each dark theme next to its light counterpart. */
export const COLOR_THEME_KEYS: ColorThemeKey[] = [
  "midnight-dark",
  "midnight-light",
  "ocean-dark",
  "ocean-light",
  "light",
  "purple-dark",
  "purple-light",
  "green-dark",
  "green-light",
  "rose-dark",
  "rose-light",
  "amber-dark",
  "amber-light",
  "slate-dark",
  "slate-light",
  "flat-dark",
  "flat-light",
  "coffee-dark",
  "coffee-light",
  "cyberpunk-dark",
  "cyberpunk-light",
  "retro-dark",
  "retro-light",
];

/** One hue's dark theme paired with its light counterpart, for UI that groups them rather than listing all twenty-three flat. */
export interface ColorThemePair {
  label: string;
  dark?: ColorThemeKey;
  light?: ColorThemeKey;
}

/**
 * {@link COLOR_THEME_KEYS} grouped by hue. `light` (chocolate) has no dark
 * counterpart, so it is the one pair with only a `light` side.
 */
export const COLOR_THEME_PAIRS: ColorThemePair[] = [
  { label: "Midnight", dark: "midnight-dark", light: "midnight-light" },
  { label: "Ocean", dark: "ocean-dark", light: "ocean-light" },
  { label: "Chocolate", light: "light" },
  { label: "Amethyst", dark: "purple-dark", light: "purple-light" },
  { label: "Nature", dark: "green-dark", light: "green-light" },
  { label: "Rose", dark: "rose-dark", light: "rose-light" },
  { label: "Amber", dark: "amber-dark", light: "amber-light" },
  { label: "Slate", dark: "slate-dark", light: "slate-light" },
  { label: "Sunset", dark: "flat-dark", light: "flat-light" },
  { label: "Coffee", dark: "coffee-dark", light: "coffee-light" },
  { label: "Cyberpunk", dark: "cyberpunk-dark", light: "cyberpunk-light" },
  { label: "Retro", dark: "retro-dark", light: "retro-light" },
];

export const COLOR_THEMES: Record<ColorThemeKey, ColorTheme> = {
  "midnight-dark": {
    bg: "#060d1a",
    bgPanel: "#09111f",
    bgSidebar: "#070e1c",
    bgHover: "rgba(255,255,255,0.03)",
    bgSelected: "rgba(34,211,238,0.07)",
    border: "rgba(255,255,255,0.06)",
    borderMid: "rgba(255,255,255,0.1)",
    borderAccent: "rgba(34,211,238,0.25)",
    accent: "#22d3ee",
    accentDim: "rgba(34,211,238,0.55)",
    accentFaint: "rgba(34,211,238,0.08)",
    text: "#94a3b8",
    textBright: "#e2e8f0",
    textDim: "rgba(100,116,139,0.8)",
    editorBg: "#040b16",
    gutterBg: "#060d1b",
    success: "#10b981",
    warn: "#f59e0b",
    error: "#ef4444",
  },
  /** Light counterpart of `COLOR_THEMES["midnight-dark"]` — same cyan accent, darkened for contrast on a pale cyan-tinted canvas. */
  "midnight-light": {
    isLight: true,
    bg: "#eef8fb",
    bgPanel: "#ffffff",
    bgSidebar: "#e0f2f7",
    bgHover: "rgba(8,47,73,0.05)",
    bgSelected: "rgba(14,116,144,0.12)",
    border: "rgba(8,47,73,0.12)",
    borderMid: "rgba(8,47,73,0.22)",
    borderAccent: "rgba(14,116,144,0.45)",
    accent: "#0e7490",
    accentDim: "#3596ad",
    accentFaint: "rgba(14,116,144,0.1)",
    text: "#164e5c",
    textBright: "#082f34",
    textDim: "#4f7c87",
    editorBg: "#ffffff",
    gutterBg: "#e6f4f8",
    success: "#15803d",
    warn: "#b45309",
    error: "#b91c1c",
  },
  "ocean-dark": {
    bg: "#061525",
    bgPanel: "#0a2035",
    bgSidebar: "#051220",
    bgHover: "rgba(50,130,184,0.08)",
    bgSelected: "rgba(3,246,255,0.08)",
    border: "rgba(50,130,184,0.15)",
    borderMid: "rgba(50,130,184,0.25)",
    borderAccent: "rgba(3,246,255,0.3)",
    accent: "#03f6ff",
    accentDim: "rgba(3,246,255,0.6)",
    accentFaint: "rgba(3,246,255,0.08)",
    text: "#9dc8e8",
    textBright: "#daf0ff",
    textDim: "rgba(100,160,200,0.7)",
    editorBg: "#040f1c",
    gutterBg: "#05111e",
    success: "#10b981",
    warn: "#f59e0b",
    error: "#ef4444",
  },
  /** Light counterpart of `COLOR_THEMES["ocean-dark"]` — same sky-blue accent, darkened for contrast on a pale blue-tinted canvas. */
  "ocean-light": {
    isLight: true,
    bg: "#eaf3fb",
    bgPanel: "#ffffff",
    bgSidebar: "#dceaf7",
    bgHover: "rgba(12,40,70,0.05)",
    bgSelected: "rgba(2,132,199,0.12)",
    border: "rgba(12,40,70,0.12)",
    borderMid: "rgba(12,40,70,0.22)",
    borderAccent: "rgba(2,132,199,0.45)",
    accent: "#0369a1",
    accentDim: "#2f8fc0",
    accentFaint: "rgba(3,105,161,0.1)",
    text: "#14425e",
    textBright: "#08283a",
    textDim: "#4c7690",
    editorBg: "#ffffff",
    gutterBg: "#e2eef9",
    success: "#15803d",
    warn: "#b45309",
    error: "#b91c1c",
  },
  /**
   * Chocolate: the app's original light theme. Warm cream panels on a deeper oat
   * canvas with a darker latte sidebar — no white anywhere — so the three
   * surfaces still read as distinct layers. Accent is a deep mahogany.
   */
  light: {
    isLight: true,
    bg: "#e6d8bf",
    bgPanel: "#faf4e8",
    bgSidebar: "#dcccae",
    bgHover: "rgba(90,54,30,0.06)",
    bgSelected: "rgba(124,45,18,0.14)",
    border: "rgba(60,36,20,0.18)",
    borderMid: "rgba(60,36,20,0.3)",
    borderAccent: "rgba(124,45,18,0.55)",
    accent: "#7c2d12",
    accentDim: "#96492a",
    accentFaint: "rgba(124,45,18,0.09)",
    text: "#382318",
    textBright: "#1c110b",
    textDim: "#6a5340",
    editorBg: "#fdf8ec",
    gutterBg: "#f0e6d3",
    success: "#3f6212",
    warn: "#b45309",
    error: "#b91c1c",
  },
  "purple-dark": {
    bg: "#170f23",
    bgPanel: "#1f1430",
    bgSidebar: "#1a1027",
    bgHover: "rgba(255,255,255,0.03)",
    bgSelected: "rgba(168,85,247,0.15)",
    border: "rgba(168,85,247,0.1)",
    borderMid: "rgba(168,85,247,0.2)",
    borderAccent: "rgba(168,85,247,0.4)",
    accent: "#c084fc",
    accentDim: "rgba(192,132,252,0.55)",
    accentFaint: "rgba(192,132,252,0.1)",
    text: "#d8b4fe",
    textBright: "#f3e8ff",
    textDim: "rgba(216,180,254,0.6)",
    editorBg: "#140d1e",
    gutterBg: "#170f23",
    success: "#10b981",
    warn: "#f59e0b",
    error: "#ef4444",
  },
  /** Light counterpart of `COLOR_THEMES["purple-dark"]` — same violet accent, darkened for contrast on a pale violet-tinted canvas. */
  "purple-light": {
    isLight: true,
    bg: "#f4eefb",
    bgPanel: "#ffffff",
    bgSidebar: "#eadff8",
    bgHover: "rgba(59,7,100,0.05)",
    bgSelected: "rgba(147,51,234,0.12)",
    border: "rgba(59,7,100,0.12)",
    borderMid: "rgba(59,7,100,0.22)",
    borderAccent: "rgba(147,51,234,0.45)",
    accent: "#7e22ce",
    accentDim: "#9d5bd6",
    accentFaint: "rgba(126,34,206,0.1)",
    text: "#4a1772",
    textBright: "#2c0a47",
    textDim: "#7c5c98",
    editorBg: "#ffffff",
    gutterBg: "#f0e6f9",
    success: "#15803d",
    warn: "#b45309",
    error: "#b91c1c",
  },
  "green-dark": {
    bg: "#0f1c13",
    bgPanel: "#132418",
    bgSidebar: "#111f15",
    bgHover: "rgba(255,255,255,0.03)",
    bgSelected: "rgba(52,211,153,0.1)",
    border: "rgba(52,211,153,0.1)",
    borderMid: "rgba(52,211,153,0.2)",
    borderAccent: "rgba(52,211,153,0.4)",
    accent: "#34d399",
    accentDim: "rgba(52,211,153,0.55)",
    accentFaint: "rgba(52,211,153,0.08)",
    text: "#a7f3d0",
    textBright: "#ecfdf5",
    textDim: "rgba(167,243,208,0.6)",
    editorBg: "#0d1710",
    gutterBg: "#0f1c13",
    success: "#10b981",
    warn: "#f59e0b",
    error: "#ef4444",
  },
  /** Light counterpart of `COLOR_THEMES["green-dark"]` — same emerald accent, darkened for contrast on a pale green-tinted canvas. */
  "green-light": {
    isLight: true,
    bg: "#eafbf2",
    bgPanel: "#ffffff",
    bgSidebar: "#ddf5e8",
    bgHover: "rgba(6,58,38,0.05)",
    bgSelected: "rgba(5,150,105,0.12)",
    border: "rgba(6,58,38,0.12)",
    borderMid: "rgba(6,58,38,0.22)",
    borderAccent: "rgba(5,150,105,0.45)",
    accent: "#047857",
    accentDim: "#34987a",
    accentFaint: "rgba(4,120,87,0.1)",
    text: "#0e4a34",
    textBright: "#062c1f",
    textDim: "#4d7c69",
    editorBg: "#ffffff",
    gutterBg: "#e2f7ec",
    success: "#15803d",
    warn: "#b45309",
    error: "#b91c1c",
  },
  "rose-dark": {
    bg: "#1a0f12",
    bgPanel: "#231319",
    bgSidebar: "#160c0f",
    bgHover: "rgba(255,255,255,0.03)",
    bgSelected: "rgba(251,113,133,0.12)",
    border: "rgba(251,113,133,0.1)",
    borderMid: "rgba(251,113,133,0.2)",
    borderAccent: "rgba(251,113,133,0.4)",
    accent: "#fb7185",
    accentDim: "rgba(251,113,133,0.55)",
    accentFaint: "rgba(251,113,133,0.08)",
    text: "#fda4af",
    textBright: "#fff1f2",
    textDim: "rgba(253,164,175,0.6)",
    editorBg: "#130a0d",
    gutterBg: "#1a0f12",
    success: "#10b981",
    warn: "#f59e0b",
    error: "#ef4444",
  },
  /** Light counterpart of `COLOR_THEMES["rose-dark"]` — same rose accent, darkened for contrast on a pale pink-tinted canvas. */
  "rose-light": {
    isLight: true,
    bg: "#fdedf0",
    bgPanel: "#ffffff",
    bgSidebar: "#fbdfe6",
    bgHover: "rgba(76,5,25,0.05)",
    bgSelected: "rgba(225,29,72,0.12)",
    border: "rgba(76,5,25,0.12)",
    borderMid: "rgba(76,5,25,0.22)",
    borderAccent: "rgba(225,29,72,0.45)",
    accent: "#be123c",
    accentDim: "#cc5776",
    accentFaint: "rgba(190,18,60,0.1)",
    text: "#6b1330",
    textBright: "#40091d",
    textDim: "#99566c",
    editorBg: "#ffffff",
    gutterBg: "#fce4e9",
    success: "#15803d",
    warn: "#b45309",
    error: "#b91c1c",
  },
  "amber-dark": {
    bg: "#1a1408",
    bgPanel: "#22190a",
    bgSidebar: "#150f05",
    bgHover: "rgba(255,255,255,0.03)",
    bgSelected: "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.1)",
    borderMid: "rgba(251,191,36,0.2)",
    borderAccent: "rgba(251,191,36,0.35)",
    accent: "#fbbf24",
    accentDim: "rgba(251,191,36,0.55)",
    accentFaint: "rgba(251,191,36,0.08)",
    text: "#fde68a",
    textBright: "#fffbeb",
    textDim: "rgba(253,230,138,0.6)",
    editorBg: "#120e05",
    gutterBg: "#1a1408",
    success: "#10b981",
    warn: "#f59e0b",
    error: "#ef4444",
  },
  /** Light counterpart of `COLOR_THEMES["amber-dark"]` — same gold accent, darkened for contrast on a pale amber-tinted canvas. */
  "amber-light": {
    isLight: true,
    bg: "#fdf6e6",
    bgPanel: "#ffffff",
    bgSidebar: "#faecc9",
    bgHover: "rgba(69,42,0,0.05)",
    bgSelected: "rgba(217,119,6,0.12)",
    border: "rgba(69,42,0,0.12)",
    borderMid: "rgba(69,42,0,0.22)",
    borderAccent: "rgba(217,119,6,0.45)",
    accent: "#b45309",
    accentDim: "#c17d3f",
    accentFaint: "rgba(180,83,9,0.1)",
    text: "#6b4310",
    textBright: "#402808",
    textDim: "#98805a",
    editorBg: "#ffffff",
    gutterBg: "#f8eed4",
    success: "#15803d",
    warn: "#9a3412",
    error: "#b91c1c",
  },
  "slate-dark": {
    bg: "#0d1117",
    bgPanel: "#161b22",
    bgSidebar: "#0d1117",
    bgHover: "rgba(255,255,255,0.03)",
    bgSelected: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.08)",
    borderMid: "rgba(148,163,184,0.15)",
    borderAccent: "rgba(148,163,184,0.3)",
    accent: "#94a3b8",
    accentDim: "rgba(148,163,184,0.55)",
    accentFaint: "rgba(148,163,184,0.08)",
    text: "#cbd5e1",
    textBright: "#f1f5f9",
    textDim: "rgba(148,163,184,0.6)",
    editorBg: "#090d12",
    gutterBg: "#0d1117",
    success: "#10b981",
    warn: "#f59e0b",
    error: "#ef4444",
  },
  /** Light counterpart of `COLOR_THEMES["slate-dark"]` — same neutral gray-blue accent on a pale neutral canvas. */
  "slate-light": {
    isLight: true,
    bg: "#f4f5f7",
    bgPanel: "#ffffff",
    bgSidebar: "#e9ebee",
    bgHover: "rgba(15,23,42,0.04)",
    bgSelected: "rgba(71,85,105,0.1)",
    border: "rgba(15,23,42,0.1)",
    borderMid: "rgba(15,23,42,0.18)",
    borderAccent: "rgba(71,85,105,0.35)",
    accent: "#475569",
    accentDim: "#64748b",
    accentFaint: "rgba(71,85,105,0.08)",
    text: "#334155",
    textBright: "#0f172a",
    textDim: "#64748b",
    editorBg: "#ffffff",
    gutterBg: "#eef0f2",
    success: "#15803d",
    warn: "#b45309",
    error: "#b91c1c",
  },
  /** Sunset: warm dusk theme — coral-orange accent over deep charcoal-brown panels. */
  "flat-dark": {
    bg: "#1c1410",
    bgPanel: "#241a14",
    bgSidebar: "#181009",
    bgHover: "rgba(255,255,255,0.03)",
    bgSelected: "rgba(255,122,89,0.13)",
    border: "rgba(255,122,89,0.1)",
    borderMid: "rgba(255,122,89,0.2)",
    borderAccent: "rgba(255,122,89,0.4)",
    accent: "#ff7a59",
    accentDim: "rgba(255,122,89,0.55)",
    accentFaint: "rgba(255,122,89,0.08)",
    text: "#e7c9b3",
    textBright: "#fff2e8",
    textDim: "rgba(231,201,179,0.6)",
    editorBg: "#160f0a",
    gutterBg: "#1c1410",
    success: "#10b981",
    warn: "#f59e0b",
    error: "#ef4444",
  },
  /** Light counterpart of `COLOR_THEMES["flat-dark"]` — same coral accent, darkened for contrast on a pale peach canvas. */
  "flat-light": {
    isLight: true,
    bg: "#fef1eb",
    bgPanel: "#ffffff",
    bgSidebar: "#fce1d5",
    bgHover: "rgba(87,26,8,0.05)",
    bgSelected: "rgba(234,88,53,0.12)",
    border: "rgba(87,26,8,0.12)",
    borderMid: "rgba(87,26,8,0.22)",
    borderAccent: "rgba(234,88,53,0.45)",
    accent: "#c2410c",
    accentDim: "#d97347",
    accentFaint: "rgba(194,65,12,0.1)",
    text: "#7c2d0e",
    textBright: "#4a1a08",
    textDim: "#a8765c",
    editorBg: "#ffffff",
    gutterBg: "#fbe6da",
    success: "#15803d",
    warn: "#b45309",
    error: "#b91c1c",
  },
  "coffee-dark": {
    bg: "#1b120c",
    bgPanel: "#241a12",
    bgSidebar: "#170f0a",
    bgHover: "rgba(255,255,255,0.03)",
    bgSelected: "rgba(198,137,88,0.12)",
    border: "rgba(198,137,88,0.1)",
    borderMid: "rgba(198,137,88,0.2)",
    borderAccent: "rgba(198,137,88,0.4)",
    accent: "#c68958",
    accentDim: "rgba(198,137,88,0.55)",
    accentFaint: "rgba(198,137,88,0.08)",
    text: "#d9b99a",
    textBright: "#f5e6d3",
    textDim: "rgba(217,185,154,0.6)",
    editorBg: "#140d08",
    gutterBg: "#1b120c",
    success: "#10b981",
    warn: "#f59e0b",
    error: "#ef4444",
  },
  /** Light counterpart of `COLOR_THEMES["coffee-dark"]` — same tan accent, deepened to a caramel for contrast on a pale cream canvas. */
  "coffee-light": {
    isLight: true,
    bg: "#f7ede1",
    bgPanel: "#fffaf3",
    bgSidebar: "#efdfc9",
    bgHover: "rgba(59,32,10,0.05)",
    bgSelected: "rgba(146,96,58,0.14)",
    border: "rgba(59,32,10,0.14)",
    borderMid: "rgba(59,32,10,0.24)",
    borderAccent: "rgba(146,96,58,0.45)",
    accent: "#92603a",
    accentDim: "#a97c54",
    accentFaint: "rgba(146,96,58,0.1)",
    text: "#4a3018",
    textBright: "#2a1a0c",
    textDim: "#7c5f42",
    editorBg: "#fffaf3",
    gutterBg: "#f1e2cc",
    success: "#15803d",
    warn: "#b45309",
    error: "#b91c1c",
  },
  /**
   * Cyberpunk: hot-magenta neon on a blue-black canvas with cyan-tinted text.
   * The canvas is deliberately blue rather than violet — a violet canvas
   * with a magenta accent collapses into Amethyst — and the status colors
   * are pushed to neon (mint / yellow / hot red) to match.
   */
  "cyberpunk-dark": {
    bg: "#050810",
    bgPanel: "#0b101c",
    bgSidebar: "#03050b",
    bgHover: "rgba(255,255,255,0.03)",
    bgSelected: "rgba(255,43,214,0.12)",
    border: "rgba(255,43,214,0.12)",
    borderMid: "rgba(255,43,214,0.22)",
    borderAccent: "rgba(255,43,214,0.45)",
    accent: "#ff2bd6",
    accentDim: "rgba(255,43,214,0.55)",
    accentFaint: "rgba(255,43,214,0.08)",
    text: "#8fd8e6",
    textBright: "#e8fbff",
    textDim: "rgba(143,216,230,0.6)",
    editorBg: "#03050b",
    gutterBg: "#050810",
    success: "#2ee6a6",
    warn: "#ffd23f",
    error: "#ff3b5c",
  },
  /** Light counterpart of `COLOR_THEMES["cyberpunk-dark"]` — same magenta accent, deepened for contrast on a cool blue-grey canvas with teal-slate text. */
  "cyberpunk-light": {
    isLight: true,
    bg: "#eef4f8",
    bgPanel: "#ffffff",
    bgSidebar: "#dfe9f1",
    bgHover: "rgba(10,40,55,0.05)",
    bgSelected: "rgba(194,16,156,0.12)",
    border: "rgba(10,40,55,0.12)",
    borderMid: "rgba(10,40,55,0.22)",
    borderAccent: "rgba(194,16,156,0.45)",
    accent: "#c2109c",
    accentDim: "#d055b7",
    accentFaint: "rgba(194,16,156,0.1)",
    text: "#123a47",
    textBright: "#07222c",
    textDim: "#4f7683",
    editorBg: "#ffffff",
    gutterBg: "#e4edf4",
    success: "#15803d",
    warn: "#b45309",
    error: "#b91c1c",
  },
  /**
   * Retro: seventies mustard on deep teal. Cream-leaning text keeps the
   * canvas warm rather than reading as another blue-green dark theme.
   */
  "retro-dark": {
    bg: "#0f2321",
    bgPanel: "#163331",
    bgSidebar: "#0b1c1a",
    bgHover: "rgba(255,255,255,0.03)",
    bgSelected: "rgba(217,164,65,0.13)",
    border: "rgba(217,164,65,0.12)",
    borderMid: "rgba(217,164,65,0.22)",
    borderAccent: "rgba(217,164,65,0.42)",
    accent: "#d9a441",
    accentDim: "rgba(217,164,65,0.55)",
    accentFaint: "rgba(217,164,65,0.08)",
    text: "#d8cbb0",
    textBright: "#f8f1e0",
    textDim: "rgba(216,203,176,0.6)",
    editorBg: "#0b1b19",
    gutterBg: "#0f2321",
    success: "#4ade80",
    warn: "#f59e0b",
    error: "#f87171",
  },
  /** Light counterpart of `COLOR_THEMES["retro-dark"]` — same mustard accent, deepened to an ochre for contrast on an aged-paper cream canvas. */
  "retro-light": {
    isLight: true,
    bg: "#f5eed8",
    bgPanel: "#fffaea",
    bgSidebar: "#ebe1c2",
    bgHover: "rgba(58,44,10,0.05)",
    bgSelected: "rgba(154,107,11,0.14)",
    border: "rgba(58,44,10,0.14)",
    borderMid: "rgba(58,44,10,0.24)",
    borderAccent: "rgba(154,107,11,0.45)",
    accent: "#9a6b0b",
    accentDim: "#b28a3b",
    accentFaint: "rgba(154,107,11,0.1)",
    text: "#463514",
    textBright: "#2a1f08",
    textDim: "#7d6a42",
    editorBg: "#fffaea",
    gutterBg: "#efe5c9",
    success: "#15803d",
    warn: "#b45309",
    error: "#b91c1c",
  },
};

/**
 * Turn a {@link ColorTheme} into the `--app-*` custom properties that the
 * `app-*` Tailwind namespace resolves against (`bg-app-panel`, `text-app-dim`,
 * `border-app-border-accent`, ...). Write the result onto an element's inline
 * style — usually `document.documentElement` — to repaint everything below it.
 *
 * Nothing is folded: every tone in the palette gets its own variable. That is
 * the point of this vocabulary versus a semantic one, which has to collapse
 * `bgSelected`, `borderAccent`, `accentFaint`, `text`, `editorBg` and
 * `gutterBg` into their nearest neighbours.
 *
 * `--app-on-solid` is derived rather than stored: text on a solid accent block
 * needs the opposite of the accent, which is white on a light theme and the
 * page background on a dark one.
 *
 * Apps still using shadcn semantic utilities in their own code should import
 * `./compat-shadcn.css` (see `src/styles/`), which aliases those variables
 * onto these.
 *
 * @param t - The palette to emit.
 * @returns CSS custom property names mapped to their values, ready for
 *   `style.setProperty`.
 */
export function appThemeCssVars(t: ColorTheme): Record<string, string> {
  return {
    "--app-bg": t.bg,
    "--app-panel": t.bgPanel,
    "--app-sidebar": t.bgSidebar,
    "--app-hover": t.bgHover,
    "--app-selected": t.bgSelected,
    "--app-border": t.border,
    "--app-border-mid": t.borderMid,
    "--app-border-accent": t.borderAccent,
    "--app-accent": t.accent,
    "--app-accent-dim": t.accentDim,
    "--app-accent-faint": t.accentFaint,
    "--app-text": t.text,
    "--app-bright": t.textBright,
    "--app-dim": t.textDim,
    "--app-editor": t.editorBg,
    "--app-gutter": t.gutterBg,
    "--app-success": t.success,
    "--app-warn": t.warn,
    "--app-error": t.error,
    "--app-on-solid": t.isLight ? "#ffffff" : t.bg,
  };
}

/**
 * Two neutral palettes — plain white and a soft neutral dark (neutral-900, not
 * OLED black) with a black / white accent — for rendering content against an
 * ordinary browser appearance rather than one of the tinted themes above.
 *
 * Deliberately NOT in {@link COLOR_THEME_KEYS}, so a theme picker built from
 * that list never offers them.
 */
export type PreviewAppearance = "light" | "dark";

/** Every {@link PreviewAppearance}, in picker order. */
export const PREVIEW_APPEARANCES: readonly PreviewAppearance[] = [
  "light",
  "dark",
];

/**
 * Validate an untrusted value (a DB column, an API payload) into a
 * {@link PreviewAppearance}, falling back to `"light"` — the default a tool or
 * gallery is created with — for anything else.
 */
export function toPreviewAppearance(raw: unknown): PreviewAppearance {
  return raw === "dark" ? "dark" : "light";
}

export const PREVIEW_PALETTES: Record<PreviewAppearance, ColorTheme> = {
  light: {
    isLight: true,
    bg: "#ffffff",
    bgPanel: "#ffffff",
    bgSidebar: "#f5f5f5",
    bgHover: "rgba(0,0,0,0.04)",
    bgSelected: "rgba(0,0,0,0.07)",
    border: "#e5e5e5",
    borderMid: "#d4d4d4",
    borderAccent: "rgba(0,0,0,0.3)",
    accent: "#0a0a0a",
    accentDim: "rgba(10,10,10,0.55)",
    accentFaint: "rgba(10,10,10,0.08)",
    text: "#404040",
    textBright: "#0a0a0a",
    textDim: "#737373",
    editorBg: "#fafafa",
    gutterBg: "#f5f5f5",
    success: "#16a34a",
    warn: "#d97706",
    error: "#dc2626",
  },
  dark: {
    // Neutral-900 family rather than pure black: OLED black reads as a hole
    // in the page, crushes every surface step into one tone, and makes text
    // glare. This keeps the same neutral (no hue) but leaves room for the
    // panel / sidebar elevations to stay visible.
    bg: "#171717",
    bgPanel: "#1f1f1f",
    bgSidebar: "#141414",
    bgHover: "rgba(255,255,255,0.06)",
    bgSelected: "rgba(255,255,255,0.1)",
    border: "#2e2e2e",
    borderMid: "#404040",
    borderAccent: "rgba(255,255,255,0.32)",
    accent: "#fafafa",
    accentDim: "rgba(250,250,250,0.55)",
    accentFaint: "rgba(250,250,250,0.1)",
    text: "#b3b3b3",
    textBright: "#fafafa",
    textDim: "#8a8a8a",
    editorBg: "#1a1a1a",
    gutterBg: "#1f1f1f",
    success: "#4ade80",
    warn: "#fbbf24",
    error: "#f87171",
  },
};
