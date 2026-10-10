#!/usr/bin/env node
/**
 * Mechanical guard for the rules in CLAUDE.md that ESLint cannot express.
 *
 *   node scripts/check-conventions.mjs        # exit 1 on any violation
 *
 * Copied from compacto-ui and adapted for planner. Two tiers:
 *
 *  - STRICT — `src/components/ui/**` plus the compacto lib copies — gets every
 *    rule below, exactly as compacto-ui enforces them on itself.
 *  - TOKENS — the rest of the app (`src/components`, `src/features`, …) gets
 *    the vocabulary rules only (`dark:`, shadcn utilities, tw-animate
 *    classes): feature code may use inline exports and relative imports, but
 *    never a colour outside the `app-*` namespace.
 *
 * Rules:
 *
 *  - `dark:` variants (palettes are complete; a dark: clause drifts from them)
 *  - shadcn semantic utilities (`bg-primary`, `text-muted-foreground`, …)
 *  - tw-animate-css classes (`animate-in`, `fade-in-0`, …) — not a dependency
 *  - relative imports of siblings/helpers (must be `@/...` so the copy resolves)
 *  - `.js` extensions on import specifiers
 *  - inline `export function|const|class` (one trailing export block)
 *  - a colorless `border` / `border-{x,y,t,r,b,l}` class in a string that
 *    supplies no border color — falls back to currentColor once copied
 *
 * The border rule is string-scoped: a class string counts as coloured if the
 * same literal also carries `border-app-*`, `border-transparent`,
 * `border-current`, `tint-current`, or a `border-[...]` arbitrary value.
 * When the colour is supplied by a different literal (a cva variant, say),
 * add a `// conventions: border-color-elsewhere` comment on the line above.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = [
  "src/components/ui",
  "src/lib/cn.ts",
  "src/lib/ui-styles.ts",
  "src/lib/color-themes.ts",
];
const TOKENS = [
  "src/app",
  "src/components/ai-elements",
  "src/components/customs",
  "src/features",
  "src/providers",
];

function walk(dir) {
  if (statSync(dir).isFile()) {
    return [dir];
  }
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out.push(...walk(p));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const SHADCN_COLOR_NAMES =
  "primary|secondary|muted|destructive|card|popover|background|foreground|border|input|ring|chart-\\d|sidebar(?:-[a-z]+)*";
const SHADCN_RE = new RegExp(
  `(?<![\\w-])(?:bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|placeholder|caret|divide|shadow|ring-offset)-(?:${SHADCN_COLOR_NAMES})(?:-foreground)?(?![\\w-])`,
);
const DARK_RE = /(?<![\w-])dark:(?=\S)/;
const ANIMATE_RE =
  /(?<![\w-])(?:animate-in|animate-out|fade-in-\d+|fade-out-\d+|zoom-in-\d+|zoom-out-\d+|slide-in-from-\w+|slide-out-to-\w+)(?![\w-])/;
const RELATIVE_IMPORT_RE = /from\s+["']\.\.?\//;
const JS_EXT_IMPORT_RE = /from\s+["'][^"']+\.js["']/;
const INLINE_EXPORT_RE = /^export\s+(?:async\s+)?(?:function|const|let|class)\b/;
const BARE_BORDER_RE = /^(?:[\w[\]=:-]+:)?border(?:-[xytrbl])?$/;
const BORDER_COLOR_RE =
  /^(?:[\w[\]=:-]+:)?(?:border(?:-[xytrbl])?-(?:app-|transparent|current|inherit|\[)|tint-current)/;

/**
 * Source with comments blanked out (newlines kept so line numbers survive).
 * JSDoc quotes forbidden vocabulary when explaining why it is forbidden.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^(\s*)\/\/.*$/gm, (m) => " ".repeat(m.length));
}

/** Every string literal (single, double, template) with its start line. */
function stringLiterals(src) {
  const out = [];
  const re = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
  let m;
  while ((m = re.exec(src))) {
    const line = src.slice(0, m.index).split("\n").length;
    out.push({ text: m[0].slice(1, -1), line });
  }
  return out;
}

const problems = [];
const report = (file, line, msg) => problems.push(`${relative(ROOT, file)}:${line}  ${msg}`);

const targets = [
  ...STRICT.map((dir) => ({ dir, strict: true })),
  ...TOKENS.map((dir) => ({ dir, strict: false })),
];

for (const { dir, strict } of targets) {
  for (const file of walk(join(ROOT, dir))) {
    const raw = readFileSync(file, "utf8");
    const src = stripComments(raw);
    const lines = src.split("\n");

    lines.forEach((code, i) => {
      const n = i + 1;
      const text = code;
      if (DARK_RE.test(code)) {
        report(file, n, "`dark:` variant — palettes are complete, drop it");
      }
      const shadcn = code.match(SHADCN_RE);
      if (shadcn) {
        report(
          file,
          n,
          `shadcn semantic utility \`${shadcn[0]}\` — use --app-* (\`app-*\` namespace)`,
        );
      }
      const anim = code.match(ANIMATE_RE);
      if (anim) {
        report(file, n, `tw-animate-css class \`${anim[0]}\` — use the library's own keyframes`);
      }
      if (!strict) {
        return;
      }
      if (RELATIVE_IMPORT_RE.test(code)) {
        report(file, n, "relative import — use the `@/...` alias so the copy resolves");
      }
      if (JS_EXT_IMPORT_RE.test(code)) {
        report(file, n, "`.js` extension on import specifier — drop it");
      }
      if (INLINE_EXPORT_RE.test(text) && file.endsWith(".tsx")) {
        report(file, n, "inline `export` on a declaration — collect exports in one trailing block");
      }
    });

    if (!strict) {
      continue;
    }
    for (const { text, line } of stringLiterals(src)) {
      const tokens = text.split(/\s+/).filter(Boolean);
      const bare = tokens.find((t) => BARE_BORDER_RE.test(t));
      if (!bare) {
        continue;
      }
      if (tokens.some((t) => BORDER_COLOR_RE.test(t))) {
        continue;
      }
      const prev = lines[line - 2] ?? "";
      if (
        /conventions:\s*border-color-elsewhere/.test(prev) ||
        /conventions:\s*border-color-elsewhere/.test(lines[line - 1] ?? "")
      ) {
        continue;
      }
      // Skip prose: a literal with no other utility-looking token is a label.
      if (tokens.length === 1 && bare === "border") {
        continue;
      }
      report(
        file,
        line,
        `colorless \`${bare}\` — pair it with \`border-app-*\` (no @layer base rule supplies a colour here)`,
      );
    }
  }
}

if (problems.length) {
  console.error(`conventions: ${problems.length} problem(s)`);
  for (const p of problems) {
    console.error(`  ${p}`);
  }
  process.exit(1);
}
console.log("conventions: clean");
